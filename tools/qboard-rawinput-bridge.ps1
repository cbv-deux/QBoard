param(
  [int]$Port = 8765,
  [string[]]$AllowedOrigin = @("https://cbv-deux.github.io"),
  [switch]$CompileOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

Add-Type -ReferencedAssemblies @(
  "System.dll",
  "System.Core.dll",
  "System.Windows.Forms.dll",
  "System.Drawing.dll"
) -TypeDefinition @'
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Net;
using System.Net.WebSockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace QBoardBridge {
  public class RawKeyboardEventArgs : EventArgs {
    public string DeviceId { get; set; }
    public string DeviceName { get; set; }
    public string Code { get; set; }
    public bool Down { get; set; }
    public int VKey { get; set; }
    public int MakeCode { get; set; }
    public int Flags { get; set; }
  }

  public class RawInputForm : Form {
    public event EventHandler<RawKeyboardEventArgs> KeyInput;

    const int WM_INPUT = 0x00FF;
    const int RID_INPUT = 0x10000003;
    const int RIDI_DEVICENAME = 0x20000007;
    const int RIM_TYPEKEYBOARD = 1;
    const int RIDEV_INPUTSINK = 0x00000100;
    const int WM_KEYDOWN = 0x0100;
    const int WM_KEYUP = 0x0101;
    const int WM_SYSKEYDOWN = 0x0104;
    const int WM_SYSKEYUP = 0x0105;

    [StructLayout(LayoutKind.Sequential)]
    struct RAWINPUTDEVICE {
      public ushort usUsagePage;
      public ushort usUsage;
      public int dwFlags;
      public IntPtr hwndTarget;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct RAWINPUTHEADER {
      public int dwType;
      public int dwSize;
      public IntPtr hDevice;
      public IntPtr wParam;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct RAWKEYBOARD {
      public ushort MakeCode;
      public ushort Flags;
      public ushort Reserved;
      public ushort VKey;
      public uint Message;
      public uint ExtraInformation;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct RAWINPUT {
      public RAWINPUTHEADER header;
      public RAWKEYBOARD keyboard;
    }

    [DllImport("User32.dll", SetLastError = true)]
    static extern bool RegisterRawInputDevices(RAWINPUTDEVICE[] pRawInputDevices, uint uiNumDevices, uint cbSize);

    [DllImport("User32.dll", SetLastError = true)]
    static extern uint GetRawInputData(IntPtr hRawInput, uint uiCommand, IntPtr pData, ref uint pcbSize, uint cbSizeHeader);

    [DllImport("User32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern uint GetRawInputDeviceInfo(IntPtr hDevice, uint uiCommand, StringBuilder pData, ref uint pcbSize);

    protected override void OnHandleCreated(EventArgs e) {
      base.OnHandleCreated(e);
      RegisterKeyboardInput();
    }

    void RegisterKeyboardInput() {
      RAWINPUTDEVICE[] devices = new RAWINPUTDEVICE[1];
      devices[0].usUsagePage = 0x01;
      devices[0].usUsage = 0x06;
      devices[0].dwFlags = RIDEV_INPUTSINK;
      devices[0].hwndTarget = this.Handle;
      if (!RegisterRawInputDevices(devices, 1, (uint)Marshal.SizeOf(typeof(RAWINPUTDEVICE)))) {
        throw new InvalidOperationException("RegisterRawInputDevices failed: " + Marshal.GetLastWin32Error());
      }
    }

    protected override void WndProc(ref Message m) {
      if (m.Msg == WM_INPUT) {
        HandleRawInput(m.LParam);
      }
      base.WndProc(ref m);
    }

    void HandleRawInput(IntPtr lParam) {
      uint size = 0;
      uint headerSize = (uint)Marshal.SizeOf(typeof(RAWINPUTHEADER));
      GetRawInputData(lParam, RID_INPUT, IntPtr.Zero, ref size, headerSize);
      if (size == 0) return;

      IntPtr buffer = Marshal.AllocHGlobal((int)size);
      try {
        uint read = GetRawInputData(lParam, RID_INPUT, buffer, ref size, headerSize);
        if (read != size) return;
        RAWINPUT input = (RAWINPUT)Marshal.PtrToStructure(buffer, typeof(RAWINPUT));
        if (input.header.dwType != RIM_TYPEKEYBOARD) return;

        uint message = input.keyboard.Message;
        bool down = message == WM_KEYDOWN || message == WM_SYSKEYDOWN;
        bool up = message == WM_KEYUP || message == WM_SYSKEYUP;
        if (!down && !up) return;

        string code = JsCodeFromVirtualKey(input.keyboard.VKey, input.keyboard.MakeCode, input.keyboard.Flags);
        if (String.IsNullOrEmpty(code)) return;

        RawKeyboardEventArgs args = new RawKeyboardEventArgs();
        args.DeviceId = GetDeviceName(input.header.hDevice);
        args.DeviceName = ShortDeviceName(args.DeviceId);
        args.Code = code;
        args.Down = down;
        args.VKey = input.keyboard.VKey;
        args.MakeCode = input.keyboard.MakeCode;
        args.Flags = input.keyboard.Flags;
        EventHandler<RawKeyboardEventArgs> handler = KeyInput;
        if (handler != null) handler(this, args);
      } finally {
        Marshal.FreeHGlobal(buffer);
      }
    }

    string GetDeviceName(IntPtr device) {
      if (device == IntPtr.Zero) return "system-keyboard";
      uint size = 0;
      GetRawInputDeviceInfo(device, RIDI_DEVICENAME, null, ref size);
      if (size == 0) return device.ToString();
      StringBuilder builder = new StringBuilder((int)size);
      uint result = GetRawInputDeviceInfo(device, RIDI_DEVICENAME, builder, ref size);
      if (result == UInt32.MaxValue) return device.ToString();
      return builder.ToString();
    }

    string ShortDeviceName(string id) {
      if (String.IsNullOrEmpty(id)) return "Keyboard";
      string upper = id.ToUpperInvariant();
      int vid = upper.IndexOf("VID_");
      int pid = upper.IndexOf("PID_");
      if (vid >= 0 && pid >= 0) {
        string vidText = upper.Substring(vid, Math.Min(8, upper.Length - vid));
        string pidText = upper.Substring(pid, Math.Min(8, upper.Length - pid));
        return "Keyboard " + vidText + " " + pidText;
      }
      if (id.Length <= 32) return id;
      return "Keyboard " + id.Substring(Math.Max(0, id.Length - 24));
    }

    string JsCodeFromVirtualKey(ushort vkey, ushort makeCode, ushort flags) {
      if (vkey >= 0x41 && vkey <= 0x5A) return "Key" + ((char)vkey).ToString();
      if (vkey >= 0x30 && vkey <= 0x39) return "Digit" + ((char)vkey).ToString();
      if (vkey >= 0x70 && vkey <= 0x7B) return "F" + (vkey - 0x6F).ToString();

      switch (vkey) {
        case 0x08: return "Backspace";
        case 0x09: return "Tab";
        case 0x0D: return "Enter";
        case 0x10: return makeCode == 0x36 ? "ShiftRight" : "ShiftLeft";
        case 0x1B: return "Escape";
        case 0x20: return "Space";
        case 0x25: return "ArrowLeft";
        case 0x26: return "ArrowUp";
        case 0x27: return "ArrowRight";
        case 0x28: return "ArrowDown";
        case 0xA0: return "ShiftLeft";
        case 0xA1: return "ShiftRight";
        case 0xBA: return "Semicolon";
        case 0xBB: return "Equal";
        case 0xBC: return "Comma";
        case 0xBD: return "Minus";
        case 0xBE: return "Period";
        case 0xBF: return "Slash";
        case 0xC0: return "Backquote";
        case 0xDB: return "BracketLeft";
        case 0xDC: return "Backslash";
        case 0xDD: return "BracketRight";
        case 0xDE: return "Quote";
      }
      return null;
    }
  }

  public class BridgeServer {
    readonly int port;
    readonly HashSet<string> allowedOrigins;
    HttpListener listener;
    CancellationTokenSource cts;
    readonly ConcurrentDictionary<string, WebSocket> clients = new ConcurrentDictionary<string, WebSocket>();

    public BridgeServer(int port, string[] origins) {
      this.port = port;
      allowedOrigins = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
      if (origins != null) {
        foreach (string origin in origins) {
          if (!String.IsNullOrWhiteSpace(origin)) allowedOrigins.Add(origin.Trim().TrimEnd('/'));
        }
      }
    }

    public string WebSocketUrl {
      get { return "ws://127.0.0.1:" + port.ToString() + "/qboard"; }
    }

    public bool IsRunning {
      get { return listener != null && listener.IsListening; }
    }

    public int ClientCount {
      get { return clients.Count; }
    }

    bool IsAllowedOrigin(string origin) {
      if (String.Equals(origin, "null", StringComparison.OrdinalIgnoreCase)) return true;
      if (String.IsNullOrWhiteSpace(origin)) return false;

      Uri uri;
      if (Uri.TryCreate(origin, UriKind.Absolute, out uri)) {
        if ((uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps) &&
            (String.Equals(uri.Host, "localhost", StringComparison.OrdinalIgnoreCase) ||
             String.Equals(uri.Host, "127.0.0.1", StringComparison.OrdinalIgnoreCase) ||
             String.Equals(uri.Host, "::1", StringComparison.OrdinalIgnoreCase))) {
          return true;
        }
      }
      return allowedOrigins.Contains(origin.Trim().TrimEnd('/'));
    }

    public void Start() {
      if (IsRunning) return;
      cts = new CancellationTokenSource();
      listener = new HttpListener();
      listener.Prefixes.Add("http://127.0.0.1:" + port.ToString() + "/");
      listener.Start();
      ThreadPool.QueueUserWorkItem(delegate {
        try { AcceptLoop(cts.Token).GetAwaiter().GetResult(); } catch {}
      });
    }

    public void Stop() {
      try {
        if (cts != null) cts.Cancel();
        if (listener != null) listener.Stop();
      } catch {}
      foreach (var pair in clients) {
        WebSocket socket;
        if (clients.TryRemove(pair.Key, out socket)) {
          try { socket.Abort(); socket.Dispose(); } catch {}
        }
      }
    }

    async Task AcceptLoop(CancellationToken token) {
      while (!token.IsCancellationRequested && listener != null && listener.IsListening) {
        HttpListenerContext context = null;
        try {
          context = await listener.GetContextAsync();
        } catch {
          break;
        }

        string path = context.Request.Url.AbsolutePath.TrimEnd('/');
        if (!context.Request.IsWebSocketRequest || path != "/qboard") {
          byte[] body = Encoding.UTF8.GetBytes("Q-board Raw Input Bridge is running.\nWebSocket: " + WebSocketUrl + "\n");
          context.Response.ContentType = "text/plain; charset=utf-8";
          context.Response.ContentLength64 = body.Length;
          await context.Response.OutputStream.WriteAsync(body, 0, body.Length);
          context.Response.Close();
          continue;
        }

        string origin = context.Request.Headers["Origin"];
        if (!IsAllowedOrigin(origin)) {
          byte[] body = Encoding.UTF8.GetBytes("This website is not allowed to use Q-board Raw Input Bridge.\n");
          context.Response.StatusCode = 403;
          context.Response.ContentType = "text/plain; charset=utf-8";
          context.Response.ContentLength64 = body.Length;
          await context.Response.OutputStream.WriteAsync(body, 0, body.Length);
          context.Response.Close();
          continue;
        }

        try {
          HttpListenerWebSocketContext wsContext = await context.AcceptWebSocketAsync(null);
          string id = Guid.NewGuid().ToString("N");
          clients[id] = wsContext.WebSocket;
          SendToSocket(wsContext.WebSocket, "{\"type\":\"hello\",\"source\":\"qboard-rawinput-bridge\"}");
          ThreadPool.QueueUserWorkItem(delegate {
            try { ReceiveLoop(id, wsContext.WebSocket, token).GetAwaiter().GetResult(); } catch {}
          });
        } catch {
          try { context.Response.StatusCode = 500; context.Response.Close(); } catch {}
        }
      }
    }

    async Task ReceiveLoop(string id, WebSocket socket, CancellationToken token) {
      byte[] buffer = new byte[256];
      try {
        while (!token.IsCancellationRequested && socket.State == WebSocketState.Open) {
          WebSocketReceiveResult result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), token);
          if (result.MessageType == WebSocketMessageType.Close) break;
        }
      } catch {}
      WebSocket removed;
      clients.TryRemove(id, out removed);
      try { socket.Dispose(); } catch {}
    }

    public void Broadcast(string json) {
      foreach (var pair in clients) {
        WebSocket socket = pair.Value;
        if (socket.State != WebSocketState.Open) {
          WebSocket removed;
          clients.TryRemove(pair.Key, out removed);
          continue;
        }
        SendToSocket(socket, json);
      }
    }

    void SendToSocket(WebSocket socket, string json) {
      try {
        byte[] data = Encoding.UTF8.GetBytes(json);
        // WebSocket permits only one send operation at a time. Raw Input can
        // deliver several make/break events in one millisecond, so serialize
        // each client's tiny localhost messages to preserve order and polyphony.
        lock (socket) {
          if (socket.State != WebSocketState.Open) throw new WebSocketException();
          socket.SendAsync(
            new ArraySegment<byte>(data),
            WebSocketMessageType.Text,
            true,
            CancellationToken.None
          ).GetAwaiter().GetResult();
        }
      } catch {
        foreach (var pair in clients) {
          if (Object.ReferenceEquals(pair.Value, socket)) {
            WebSocket removed;
            clients.TryRemove(pair.Key, out removed);
            break;
          }
        }
      }
    }
  }
}
'@

if ($CompileOnly) {
  "compile-ok"
  return
}

$server = [QBoardBridge.BridgeServer]::new($Port, [string[]]$AllowedOrigin)
$form = New-Object QBoardBridge.RawInputForm
$form.Text = "Q-board Raw Input Bridge"
$form.StartPosition = "CenterScreen"
$form.Size = New-Object System.Drawing.Size(560, 390)
$form.MinimumSize = New-Object System.Drawing.Size(480, 320)

$font = New-Object System.Drawing.Font("Segoe UI", 9)
$form.Font = $font

$urlLabel = New-Object System.Windows.Forms.Label
$urlLabel.AutoSize = $true
$urlLabel.Location = New-Object System.Drawing.Point(14, 14)
$urlLabel.Text = "WebSocket: $($server.WebSocketUrl)"

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.AutoSize = $true
$statusLabel.Location = New-Object System.Drawing.Point(14, 42)
$statusLabel.Text = "Status: starting"

$clientLabel = New-Object System.Windows.Forms.Label
$clientLabel.AutoSize = $true
$clientLabel.Location = New-Object System.Drawing.Point(170, 42)
$clientLabel.Text = "Clients: 0"

$lastLabel = New-Object System.Windows.Forms.Label
$lastLabel.AutoSize = $true
$lastLabel.Location = New-Object System.Drawing.Point(14, 70)
$lastLabel.Text = "Last key: --"

$startButton = New-Object System.Windows.Forms.Button
$startButton.Location = New-Object System.Drawing.Point(14, 102)
$startButton.Size = New-Object System.Drawing.Size(98, 28)
$startButton.Text = "Start"

$stopButton = New-Object System.Windows.Forms.Button
$stopButton.Location = New-Object System.Drawing.Point(120, 102)
$stopButton.Size = New-Object System.Drawing.Size(98, 28)
$stopButton.Text = "Stop"

$copyButton = New-Object System.Windows.Forms.Button
$copyButton.Location = New-Object System.Drawing.Point(226, 102)
$copyButton.Size = New-Object System.Drawing.Size(98, 28)
$copyButton.Text = "Copy URL"

$logBox = New-Object System.Windows.Forms.RichTextBox
$logBox.Location = New-Object System.Drawing.Point(14, 142)
$logBox.Size = New-Object System.Drawing.Size(514, 195)
$logBox.Anchor = "Top, Bottom, Left, Right"
$logBox.ReadOnly = $true
$logBox.BackColor = [System.Drawing.Color]::White

function Write-BridgeLog {
  param([string]$Text)
  $timestamp = Get-Date -Format "HH:mm:ss"
  $logBox.AppendText("[$timestamp] $Text`r`n")
  $logBox.SelectionStart = $logBox.TextLength
  $logBox.ScrollToCaret()
}

function Update-BridgeStatus {
  if ($server.IsRunning) {
    $statusLabel.Text = "Status: listening"
  } else {
    $statusLabel.Text = "Status: stopped"
  }
  $clientLabel.Text = "Clients: $($server.ClientCount)"
}

function Start-BridgeServer {
  try {
    $server.Start()
    Update-BridgeStatus
    Write-BridgeLog "Listening at $($server.WebSocketUrl)"
  } catch {
    Update-BridgeStatus
    Write-BridgeLog "Start failed: $($_.Exception.Message)"
    [System.Windows.Forms.MessageBox]::Show(
      "Could not start the bridge on port $Port.`r`n`r`n$($_.Exception.Message)",
      "Q-board Raw Input Bridge",
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
  }
}

$startButton.Add_Click({ Start-BridgeServer })
$stopButton.Add_Click({
  $server.Stop()
  Update-BridgeStatus
  Write-BridgeLog "Stopped"
})
$copyButton.Add_Click({
  [System.Windows.Forms.Clipboard]::SetText($server.WebSocketUrl)
  Write-BridgeLog "Copied URL"
})

$form.add_KeyInput({
  param($sender, $eventArgs)
  $direction = if ($eventArgs.Down) { "down" } else { "up" }
  $lastLabel.Text = "Last key: $($eventArgs.DeviceName)  $($eventArgs.Code)  $direction"
  $payload = [ordered]@{
    type = "key"
    down = [bool]$eventArgs.Down
    code = [string]$eventArgs.Code
    deviceId = [string]$eventArgs.DeviceId
    deviceName = [string]$eventArgs.DeviceName
    vkey = [int]$eventArgs.VKey
    makeCode = [int]$eventArgs.MakeCode
    flags = [int]$eventArgs.Flags
    time = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  }
  $json = $payload | ConvertTo-Json -Compress
  $server.Broadcast($json)
  if ($eventArgs.Down) {
    Write-BridgeLog "$($eventArgs.DeviceName) -> $($eventArgs.Code)"
  }
})

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 500
$timer.Add_Tick({ Update-BridgeStatus })
$timer.Start()

$form.Controls.AddRange(@(
  $urlLabel,
  $statusLabel,
  $clientLabel,
  $lastLabel,
  $startButton,
  $stopButton,
  $copyButton,
  $logBox
))

$form.Add_Shown({ Start-BridgeServer })
$form.Add_FormClosing({
  $timer.Stop()
  $server.Stop()
})

[System.Windows.Forms.Application]::EnableVisualStyles()
[System.Windows.Forms.Application]::Run($form)
