using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Drawing;
using System.Net;
using System.Net.WebSockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

[assembly: System.Reflection.AssemblyTitle("Q-board Raw Input Bridge")]
[assembly: System.Reflection.AssemblyProduct("Q-board")]
[assembly: System.Reflection.AssemblyVersion("2.0.0.0")]

namespace QBoardBridge {
  public sealed class RawKeyboardEventArgs : EventArgs {
    public string DeviceId { get; set; }
    public string DeviceName { get; set; }
    public string Code { get; set; }
    public bool Down { get; set; }
    public int VKey { get; set; }
    public int MakeCode { get; set; }
    public int Flags { get; set; }
  }

  public sealed class BridgeServer : IDisposable {
    readonly int port;
    readonly HashSet<string> allowedOrigins;
    readonly ConcurrentDictionary<string, WebSocket> clients = new ConcurrentDictionary<string, WebSocket>();
    HttpListener listener;
    CancellationTokenSource cancellation;

    public BridgeServer(int port, IEnumerable<string> origins) {
      this.port = port;
      allowedOrigins = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
      if (origins == null) return;
      foreach (string origin in origins) {
        if (!String.IsNullOrWhiteSpace(origin)) allowedOrigins.Add(origin.Trim().TrimEnd('/'));
      }
    }

    public bool IsRunning {
      get { return listener != null && listener.IsListening; }
    }

    public int ClientCount {
      get { return clients.Count; }
    }

    public string WebSocketUrl {
      get { return "ws://127.0.0.1:" + port.ToString() + "/qboard"; }
    }

    public void Start() {
      if (IsRunning) return;
      cancellation = new CancellationTokenSource();
      listener = new HttpListener();
      listener.Prefixes.Add("http://127.0.0.1:" + port.ToString() + "/");
      listener.Start();
      ThreadPool.QueueUserWorkItem(delegate {
        try { AcceptLoop(cancellation.Token).GetAwaiter().GetResult(); } catch { }
      });
    }

    public void Stop() {
      try {
        if (cancellation != null) cancellation.Cancel();
        if (listener != null) listener.Stop();
      } catch { }
      foreach (KeyValuePair<string, WebSocket> pair in clients) {
        WebSocket socket;
        if (!clients.TryRemove(pair.Key, out socket)) continue;
        try { socket.Abort(); socket.Dispose(); } catch { }
      }
    }

    public void BroadcastKey(RawKeyboardEventArgs key) {
      string json = "{\"type\":\"key\",\"down\":" + (key.Down ? "true" : "false")
        + ",\"code\":\"" + Json(key.Code) + "\""
        + ",\"deviceId\":\"" + Json(key.DeviceId) + "\""
        + ",\"deviceName\":\"" + Json(key.DeviceName) + "\""
        + ",\"vkey\":" + key.VKey.ToString()
        + ",\"makeCode\":" + key.MakeCode.ToString()
        + ",\"flags\":" + key.Flags.ToString()
        + ",\"time\":" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString() + "}";
      Broadcast(json);
    }

    public void BroadcastStatus() {
      Broadcast(StatusJson("status"));
    }

    async Task AcceptLoop(CancellationToken token) {
      while (!token.IsCancellationRequested && IsRunning) {
        HttpListenerContext context;
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

        if (!IsAllowedOrigin(context.Request.Headers["Origin"])) {
          byte[] body = Encoding.UTF8.GetBytes("This website is not allowed to use Q-board Raw Input Bridge.\n");
          context.Response.StatusCode = 403;
          context.Response.ContentType = "text/plain; charset=utf-8";
          context.Response.ContentLength64 = body.Length;
          await context.Response.OutputStream.WriteAsync(body, 0, body.Length);
          context.Response.Close();
          continue;
        }

        try {
          HttpListenerWebSocketContext webSocketContext = await context.AcceptWebSocketAsync(null);
          string id = Guid.NewGuid().ToString("N");
          clients[id] = webSocketContext.WebSocket;
          Send(webSocketContext.WebSocket, StatusJson("hello"));
          BroadcastStatus();
          ThreadPool.QueueUserWorkItem(delegate {
            try { ReceiveLoop(id, webSocketContext.WebSocket, token).GetAwaiter().GetResult(); } catch { }
          });
        } catch {
          try { context.Response.StatusCode = 500; context.Response.Close(); } catch { }
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
      } catch { }
      WebSocket removed;
      clients.TryRemove(id, out removed);
      try { socket.Dispose(); } catch { }
      BroadcastStatus();
    }

    bool IsAllowedOrigin(string origin) {
      if (String.Equals(origin, "null", StringComparison.OrdinalIgnoreCase)) return true;
      if (String.IsNullOrWhiteSpace(origin)) return false;
      Uri uri;
      if (Uri.TryCreate(origin, UriKind.Absolute, out uri)) {
        bool localHost = String.Equals(uri.Host, "localhost", StringComparison.OrdinalIgnoreCase)
          || String.Equals(uri.Host, "127.0.0.1", StringComparison.OrdinalIgnoreCase)
          || String.Equals(uri.Host, "::1", StringComparison.OrdinalIgnoreCase);
        if (localHost && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)) return true;
      }
      return allowedOrigins.Contains(origin.Trim().TrimEnd('/'));
    }

    string StatusJson(string type) {
      string installPath = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
      return "{\"type\":\"" + type + "\",\"source\":\"qboard-rawinput-bridge\",\"version\":2"
        + ",\"clients\":" + ClientCount.ToString()
        + ",\"installPath\":\"" + Json(installPath) + "\"}";
    }

    void Broadcast(string json) {
      foreach (KeyValuePair<string, WebSocket> pair in clients) {
        WebSocket socket = pair.Value;
        if (socket.State != WebSocketState.Open) {
          WebSocket removed;
          clients.TryRemove(pair.Key, out removed);
          continue;
        }
        Send(socket, json);
      }
    }

    void Send(WebSocket socket, string json) {
      try {
        byte[] data = Encoding.UTF8.GetBytes(json);
        lock (socket) {
          if (socket.State != WebSocketState.Open) throw new WebSocketException();
          socket.SendAsync(new ArraySegment<byte>(data), WebSocketMessageType.Text, true, CancellationToken.None)
            .GetAwaiter().GetResult();
        }
      } catch { }
    }

    static string Json(string value) {
      if (value == null) return "";
      return value.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "\\r").Replace("\n", "\\n");
    }

    public void Dispose() {
      Stop();
      if (cancellation != null) cancellation.Dispose();
    }
  }

  public sealed class BridgeForm : Form {
    const int WM_INPUT = 0x00FF;
    const int RID_INPUT = unchecked((int)0x10000003);
    const int RIDI_DEVICENAME = 0x20000007;
    const int RIM_TYPEKEYBOARD = 1;
    const int RIDEV_INPUTSINK = 0x00000100;
    const int WM_KEYDOWN = 0x0100;
    const int WM_KEYUP = 0x0101;
    const int WM_SYSKEYDOWN = 0x0104;
    const int WM_SYSKEYUP = 0x0105;

    readonly BridgeServer server;
    readonly Label statusLabel;
    readonly Label clientLabel;
    readonly Label keyLabel;
    readonly Button toggleButton;
    readonly System.Windows.Forms.Timer statusTimer;

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
    static extern bool RegisterRawInputDevices(RAWINPUTDEVICE[] devices, uint count, uint size);

    [DllImport("User32.dll", SetLastError = true)]
    static extern uint GetRawInputData(IntPtr rawInput, uint command, IntPtr data, ref uint size, uint headerSize);

    [DllImport("User32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern uint GetRawInputDeviceInfo(IntPtr device, uint command, StringBuilder data, ref uint size);

    public BridgeForm() {
      Text = "Q-board Bridge";
      StartPosition = FormStartPosition.CenterScreen;
      ClientSize = new Size(132, 174);
      MinimumSize = new Size(148, 213);
      MaximumSize = new Size(148, 213);
      MaximizeBox = false;
      FormBorderStyle = FormBorderStyle.FixedSingle;
      Font = new Font("Segoe UI", 8.5F);

      statusLabel = MakeLabel(8, 10, 116, 34, "Starting");
      statusLabel.Font = new Font(Font, FontStyle.Bold);
      clientLabel = MakeLabel(8, 50, 116, 24, "Clients 0");
      keyLabel = MakeLabel(8, 78, 116, 48, "Waiting for key");
      keyLabel.AutoEllipsis = true;
      toggleButton = new Button();
      toggleButton.Location = new Point(10, 134);
      toggleButton.Size = new Size(112, 30);
      toggleButton.Text = "Stop";
      toggleButton.Click += ToggleServer;
      Controls.Add(statusLabel);
      Controls.Add(clientLabel);
      Controls.Add(keyLabel);
      Controls.Add(toggleButton);

      server = new BridgeServer(8765, new string[] { "https://cbv-deux.github.io" });
      statusTimer = new System.Windows.Forms.Timer();
      statusTimer.Interval = 400;
      statusTimer.Tick += delegate { RefreshStatus(); };
      statusTimer.Start();
      Shown += delegate { StartServer(); };
      FormClosing += delegate { server.Dispose(); };
    }

    Label MakeLabel(int x, int y, int width, int height, string text) {
      Label label = new Label();
      label.Location = new Point(x, y);
      label.Size = new Size(width, height);
      label.Text = text;
      label.TextAlign = ContentAlignment.MiddleCenter;
      return label;
    }

    protected override void OnHandleCreated(EventArgs e) {
      base.OnHandleCreated(e);
      RAWINPUTDEVICE[] devices = new RAWINPUTDEVICE[1];
      devices[0].usUsagePage = 0x01;
      devices[0].usUsage = 0x06;
      devices[0].dwFlags = RIDEV_INPUTSINK;
      devices[0].hwndTarget = Handle;
      if (!RegisterRawInputDevices(devices, 1, (uint)Marshal.SizeOf(typeof(RAWINPUTDEVICE)))) {
        MessageBox.Show("Raw Input registration failed: " + Marshal.GetLastWin32Error().ToString(), Text);
      }
    }

    protected override void WndProc(ref Message message) {
      if (message.Msg == WM_INPUT) HandleRawInput(message.LParam);
      base.WndProc(ref message);
    }

    void StartServer() {
      try {
        server.Start();
      } catch (Exception error) {
        statusLabel.Text = "Start failed";
        toggleButton.Text = "Retry";
        MessageBox.Show(error.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
      }
      RefreshStatus();
    }

    void ToggleServer(object sender, EventArgs e) {
      if (server.IsRunning) server.Stop();
      else StartServer();
      RefreshStatus();
    }

    void RefreshStatus() {
      statusLabel.Text = server.IsRunning ? "Connected" : "Stopped";
      clientLabel.Text = "Clients " + server.ClientCount.ToString();
      toggleButton.Text = server.IsRunning ? "Stop" : "Start";
    }

    void HandleRawInput(IntPtr rawInputHandle) {
      uint size = 0;
      uint headerSize = (uint)Marshal.SizeOf(typeof(RAWINPUTHEADER));
      GetRawInputData(rawInputHandle, (uint)RID_INPUT, IntPtr.Zero, ref size, headerSize);
      if (size == 0) return;
      IntPtr buffer = Marshal.AllocHGlobal((int)size);
      try {
        uint read = GetRawInputData(rawInputHandle, (uint)RID_INPUT, buffer, ref size, headerSize);
        if (read != size) return;
        RAWINPUT input = (RAWINPUT)Marshal.PtrToStructure(buffer, typeof(RAWINPUT));
        if (input.header.dwType != RIM_TYPEKEYBOARD) return;
        bool down = input.keyboard.Message == WM_KEYDOWN || input.keyboard.Message == WM_SYSKEYDOWN;
        bool up = input.keyboard.Message == WM_KEYUP || input.keyboard.Message == WM_SYSKEYUP;
        if (!down && !up) return;
        string code = JsCode(input.keyboard.VKey, input.keyboard.MakeCode);
        if (String.IsNullOrEmpty(code)) return;
        RawKeyboardEventArgs key = new RawKeyboardEventArgs();
        key.DeviceId = DeviceName(input.header.hDevice);
        key.DeviceName = ShortDeviceName(key.DeviceId);
        key.Code = code;
        key.Down = down;
        key.VKey = input.keyboard.VKey;
        key.MakeCode = input.keyboard.MakeCode;
        key.Flags = input.keyboard.Flags;
        keyLabel.Text = code + (down ? " down" : " up");
        server.BroadcastKey(key);
      } finally {
        Marshal.FreeHGlobal(buffer);
      }
    }

    string DeviceName(IntPtr device) {
      if (device == IntPtr.Zero) return "system-keyboard";
      uint size = 0;
      GetRawInputDeviceInfo(device, RIDI_DEVICENAME, null, ref size);
      if (size == 0) return device.ToString();
      StringBuilder name = new StringBuilder((int)size + 1);
      uint result = GetRawInputDeviceInfo(device, RIDI_DEVICENAME, name, ref size);
      return result == UInt32.MaxValue ? device.ToString() : name.ToString();
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
      return id.Length <= 30 ? id : "Keyboard " + id.Substring(id.Length - 22);
    }

    string JsCode(ushort vkey, ushort makeCode) {
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
        case 0x21: return "PageUp";
        case 0x22: return "PageDown";
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

  static class Program {
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern IntPtr FindWindow(string className, string windowName);

    [DllImport("user32.dll")]
    static extern bool SetForegroundWindow(IntPtr window);

    [DllImport("user32.dll")]
    static extern bool ShowWindow(IntPtr window, int command);

    [STAThread]
    static void Main(string[] args) {
      if (args.Length > 0 && args[0] == "--verify") return;
      bool created;
      using (Mutex mutex = new Mutex(true, "QBoard.RawInputBridge.2", out created)) {
        if (!created) {
          IntPtr existing = FindWindow(null, "Q-board Bridge");
          if (existing != IntPtr.Zero) {
            ShowWindow(existing, 9);
            SetForegroundWindow(existing);
          }
          return;
        }
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new BridgeForm());
      }
    }
  }
}
