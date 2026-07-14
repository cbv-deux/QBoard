using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("Q-board Bridge Installer")]
[assembly: AssemblyProduct("Q-board")]
[assembly: AssemblyVersion("2.0.0.0")]

namespace QBoardBridgeInstaller {
  public sealed class InstallerForm : Form {
    readonly TextBox pathBox;
    readonly Button browseButton;
    readonly Button installButton;

    public InstallerForm() {
      Text = "Q-board Bridge Installer";
      StartPosition = FormStartPosition.CenterScreen;
      ClientSize = new Size(520, 178);
      MinimumSize = new Size(536, 217);
      MaximizeBox = false;
      FormBorderStyle = FormBorderStyle.FixedDialog;
      Font = new Font("Segoe UI", 9F);

      Label title = new Label();
      title.Location = new Point(18, 16);
      title.Size = new Size(484, 28);
      title.Font = new Font(Font, FontStyle.Bold);
      title.Text = "安装 Q-board 外接键盘桥接器";

      Label prompt = new Label();
      prompt.Location = new Point(18, 50);
      prompt.Size = new Size(484, 22);
      prompt.Text = "选择安装目录：";

      pathBox = new TextBox();
      pathBox.Location = new Point(18, 76);
      pathBox.Size = new Size(386, 25);
      pathBox.Text = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "QBoard Bridge");

      browseButton = new Button();
      browseButton.Location = new Point(414, 74);
      browseButton.Size = new Size(88, 29);
      browseButton.Text = "浏览...";
      browseButton.Click += Browse;

      installButton = new Button();
      installButton.Location = new Point(352, 122);
      installButton.Size = new Size(150, 36);
      installButton.Text = "安装并打开";
      installButton.Click += Install;

      Controls.Add(title);
      Controls.Add(prompt);
      Controls.Add(pathBox);
      Controls.Add(browseButton);
      Controls.Add(installButton);
      AcceptButton = installButton;
    }

    void Browse(object sender, EventArgs e) {
      using (FolderBrowserDialog dialog = new FolderBrowserDialog()) {
        dialog.Description = "选择 Q-board Bridge 安装目录";
        dialog.SelectedPath = pathBox.Text;
        if (dialog.ShowDialog(this) == DialogResult.OK) pathBox.Text = dialog.SelectedPath;
      }
    }

    void Install(object sender, EventArgs e) {
      installButton.Enabled = false;
      try {
        string directory = Path.GetFullPath(Environment.ExpandEnvironmentVariables(pathBox.Text.Trim()));
        Directory.CreateDirectory(directory);
        string executablePath = Path.Combine(directory, "QBoardBridge.exe");
        using (Stream source = Assembly.GetExecutingAssembly().GetManifestResourceStream("QBoardBridge.payload")) {
          if (source == null) throw new InvalidOperationException("安装器内缺少 QBoardBridge.exe。请重新下载。 ");
          using (FileStream destination = new FileStream(executablePath, FileMode.Create, FileAccess.Write, FileShare.None)) {
            using (GZipStream payload = new GZipStream(source, CompressionMode.Decompress)) {
              payload.CopyTo(destination);
            }
          }
        }
        File.WriteAllText(Path.Combine(directory, "install-path.txt"), directory);
        RegisterProtocol(executablePath);
        Clipboard.SetText(directory);
        Process.Start(new ProcessStartInfo(executablePath, "qboardbridge://installed") { UseShellExecute = true });
        MessageBox.Show(
          "安装完成。以下路径已复制，请粘贴到 Q-board 的“本地桥接器连接”窗口：\r\n\r\n" + directory,
          Text,
          MessageBoxButtons.OK,
          MessageBoxIcon.Information
        );
        Close();
      } catch (Exception error) {
        MessageBox.Show("安装失败：\r\n" + error.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
        installButton.Enabled = true;
      }
    }

    static void RegisterProtocol(string executablePath) {
      using (RegistryKey protocol = Registry.CurrentUser.CreateSubKey(@"Software\Classes\qboardbridge")) {
        protocol.SetValue("", "URL:Q-board Bridge Protocol");
        protocol.SetValue("URL Protocol", "");
      }
      using (RegistryKey icon = Registry.CurrentUser.CreateSubKey(@"Software\Classes\qboardbridge\DefaultIcon")) {
        icon.SetValue("", "\"" + executablePath + "\",0");
      }
      using (RegistryKey command = Registry.CurrentUser.CreateSubKey(@"Software\Classes\qboardbridge\shell\open\command")) {
        command.SetValue("", "\"" + executablePath + "\" \"%1\"");
      }
    }
  }

  static class Program {
    static bool VerifyPayload() {
      using (Stream source = Assembly.GetExecutingAssembly().GetManifestResourceStream("QBoardBridge.payload")) {
        if (source == null) return false;
        using (GZipStream payload = new GZipStream(source, CompressionMode.Decompress)) {
          return payload.ReadByte() == 'M' && payload.ReadByte() == 'Z';
        }
      }
    }

    [STAThread]
    static void Main(string[] args) {
      if (args.Length > 0 && args[0] == "--verify") {
        Environment.ExitCode = VerifyPayload() ? 0 : 2;
        return;
      }
      Application.EnableVisualStyles();
      Application.SetCompatibleTextRenderingDefault(false);
      Application.Run(new InstallerForm());
    }
  }
}
