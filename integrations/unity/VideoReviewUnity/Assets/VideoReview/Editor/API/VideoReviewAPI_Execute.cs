using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using UnityEngine;

namespace VideoReview.Editor.API
{
    internal static class VideoReviewAPIExecute
    {
        internal static VideoReviewCommandResult Run(
            string command,
            string[] args,
            string serverUrl,
            string apiToken,
            int timeoutMs,
            string cliRootOverride = null)
        {
            var executablePath = ResolveExecutablePath(cliRootOverride);
            EnsureExecutablePermissionIfNeeded(executablePath);

            var allArgs = BuildArguments(command, args, serverUrl, apiToken);
            var psi = new ProcessStartInfo
            {
                FileName = executablePath,
                Arguments = allArgs,
                WorkingDirectory = Path.GetDirectoryName(executablePath) ?? Directory.GetCurrentDirectory(),
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true,
            };

            if (!string.IsNullOrWhiteSpace(serverUrl))
            {
                psi.EnvironmentVariables["VIDEO_REVIEW_SERVER_URL"] = serverUrl;
            }
            if (!string.IsNullOrWhiteSpace(apiToken))
            {
                psi.EnvironmentVariables["VIDEO_REVIEW_API_TOKEN"] = apiToken;
            }

            using var process = new Process { StartInfo = psi };
            process.Start();

            var stdOutTask = process.StandardOutput.ReadToEndAsync();
            var stdErrTask = process.StandardError.ReadToEndAsync();

            var timedOut = !process.WaitForExit(Math.Max(1, timeoutMs));
            if (timedOut)
            {
                try
                {
                    process.Kill();
                }
                catch
                {
                    // Ignore cleanup errors on timeout.
                }
            }

            Task.WaitAll(new Task[] { stdOutTask, stdErrTask }, Math.Max(1, timeoutMs));
            var stdOut = stdOutTask.IsCompleted ? stdOutTask.Result : string.Empty;
            var stdErr = stdErrTask.IsCompleted ? stdErrTask.Result : string.Empty;
            var exitCode = timedOut ? -1 : process.ExitCode;

            return new VideoReviewCommandResult
            {
                success = !timedOut && exitCode == 0,
                timedOut = timedOut,
                exitCode = exitCode,
                command = allArgs,
                stdOut = stdOut,
                stdErr = stdErr,
            };
        }

        private static string ResolveExecutablePath(string cliRootOverride = null)
        {
            var root = !string.IsNullOrEmpty(cliRootOverride)
                ? cliRootOverride
                : Path.Combine(Application.dataPath, "VideoReview", "Editor", "API");
            
            var platformDir = Path.Combine(root, "bin", GetPlatformDirectoryName());
            if (!Directory.Exists(platformDir))
            {
                throw new FileNotFoundException($"VideoReview CLI directory not found: {platformDir}");
            }

            var files = Directory
                .GetFiles(platformDir)
                .Where(path => GetBinaryPriority(path) < NotTheCli)
                .OrderBy(GetBinaryPriority)
                .ToArray();

            var found = files.FirstOrDefault(file => new FileInfo(file).Length > 0);
            if (found == null)
            {
                throw new FileNotFoundException($"No CLI binary in {platformDir}. Put {GetReleaseBinaryName()} there.");
            }

            return found;
        }

        private const int NotTheCli = 10;

        // The binary as the release names it comes first, so a downloaded one works without renaming.
        private static int GetBinaryPriority(string path)
        {
            var name = Path.GetFileName(path);
            if (string.Equals(name, GetReleaseBinaryName(), StringComparison.OrdinalIgnoreCase))
            {
                return 0;
            }
            if (string.Equals(name, "video-review-cli.exe", StringComparison.OrdinalIgnoreCase))
            {
                return 1;
            }
            if (string.Equals(name, "video-review-cli", StringComparison.OrdinalIgnoreCase))
            {
                return 2;
            }
            return NotTheCli;
        }

        // Such as video-review-cli-windows-amd64.exe, as the release workflow builds it.
        private static string GetReleaseBinaryName()
        {
            var arch = RuntimeInformation.OSArchitecture == Architecture.Arm64 ? "arm64" : "amd64";
            switch (Application.platform)
            {
                case RuntimePlatform.WindowsEditor:
                    return $"video-review-cli-windows-{arch}.exe";
                case RuntimePlatform.OSXEditor:
                    return $"video-review-cli-darwin-{arch}";
                default:
                    return $"video-review-cli-linux-{arch}";
            }
        }

        private static void ValidateExecutable(string path)
        {
            if (!File.Exists(path))
            {
                throw new FileNotFoundException($"CLI binary not found: {path}");
            }

            var info = new FileInfo(path);
            if (info.Length == 0)
            {
                throw new FileLoadException($"CLI binary is empty: {path}");
            }
        }

        private static string GetPlatformDirectoryName()
        {
            switch (Application.platform)
            {
                case RuntimePlatform.WindowsEditor:
                    return "Windows";
                case RuntimePlatform.OSXEditor:
                    return "Mac";
                case RuntimePlatform.LinuxEditor:
                    return "Linux";
                default:
                    throw new PlatformNotSupportedException($"Unsupported editor platform: {Application.platform}");
            }
        }

        private static void EnsureExecutablePermissionIfNeeded(string executablePath)
        {
            if (Application.platform == RuntimePlatform.WindowsEditor)
            {
                return;
            }

            try
            {
                using var chmod = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "/bin/chmod",
                        Arguments = $"+x {Quote(executablePath)}",
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        CreateNoWindow = true,
                    }
                };
                chmod.Start();
                chmod.WaitForExit(5000);
            }
            catch (Exception e)
            {
                UnityEngine.Debug.LogWarning($"[VideoReview] Failed to chmod CLI binary: {e.Message}");
            }
        }

        private static string BuildArguments(string command, string[] args, string serverUrl, string apiToken)
        {
            var sb = new StringBuilder();

            if (!string.IsNullOrWhiteSpace(serverUrl))
            {
                sb.Append("--server ").Append(Quote(serverUrl)).Append(' ');
            }
            if (!string.IsNullOrWhiteSpace(apiToken))
            {
                sb.Append("--token ").Append(Quote(apiToken)).Append(' ');
            }

            sb.Append(Quote(command));

            if (args != null)
            {
                foreach (var arg in args)
                {
                    sb.Append(' ').Append(Quote(arg));
                }
            }

            return sb.ToString();
        }

        private static string Quote(string arg)
        {
            if (string.IsNullOrEmpty(arg))
            {
                return "\"\"";
            }

            var escaped = arg.Replace("\\", "\\\\").Replace("\"", "\\\"");
            return $"\"{escaped}\"";
        }
    }
}
