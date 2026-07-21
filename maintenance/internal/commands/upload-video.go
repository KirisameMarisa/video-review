package commands

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	. "videoreview-maintenance/internal/lib"
)

func RunUploadVideo(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	title := fs.String("title", "", "title of the video")
	folderKey := fs.String("folder_key", "", "folder key for the video")
	scenePath := fs.String("scene_path", "", "scene path of the video")
	videoPath := fs.String("video_path", "", "path to the video file")
	vcsWatchPaths := fs.String("vcs_watch_paths", "", "comma-separated list of file paths to watch for VCS changes")
	fs.Parse(args)

	if *title == "" || *folderKey == "" {
		fmt.Println("title, folder_key and scene_path are required")
		fs.Usage()
		return
	}

	if *videoPath == "" {
		fmt.Println("video_path is required")
		fs.Usage()
		return
	}

	if _, err := os.Stat(*videoPath); err != nil {
		fmt.Println("video file does not exist or cannot be accessed:", err)
		return
	}

	var session UploadSessionWithURL
	{
		b, err := FetchRaw(FetchOptions{
			Method: POST,
			Path:   "/api/v1/videos/upload/init",
			Form: map[string]string{
				"folderKey":     *folderKey,
				"title":         *title,
				"scenePath":     *scenePath,
				"vcsWatchPaths": *vcsWatchPaths,
			},
		})
		if err != nil {
			fmt.Println("failed to fetch upload session:", err)
			return
		}
		if err := json.Unmarshal(b, &session); err != nil {
			fmt.Println("failed to unmarshal upload session:", err)
			return
		}
	}

	file, err := os.Open(*videoPath)
	if err != nil {
		fmt.Println("failed to open video file:", err)
		return
	}
	defer file.Close()

	if session.Session.Storage == "s3" {
		// S3 upload
		req, err := http.NewRequest("PUT", session.URL, file)
		if err != nil {
			fmt.Println("failed to create request for S3 upload:", err)
			return
		}
		req.Header.Set("Content-Type", "video/mp4")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			fmt.Println("failed to upload to S3:", err)
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode >= 400 {
			b, _ := io.ReadAll(resp.Body)
			fmt.Printf("failed to upload to S3: status %d: %s\n", resp.StatusCode, string(b))
			return
		}
	} else {
		// local or nextCloud upload
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)

		part, err := writer.CreateFormFile("file", filepath.Base(*videoPath))
		if err != nil {
			fmt.Println("failed to create multipart file:", err)
			return
		}
		_, err = io.Copy(part, file)
		if err != nil {
			fmt.Println("failed to write file to multipart:", err)
			return
		}
		writer.Close()

		req, err := http.NewRequest("PUT", GlobalConfig.BaseURL+session.URL, body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		req.Header.Set("x-api-token", GlobalConfig.APIToken)

		if err != nil {
			fmt.Println("failed to create request for upload:", err)
			return
		}
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			fmt.Println("failed to upload video:", err)
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode >= 400 {
			b, _ := io.ReadAll(resp.Body)
			fmt.Printf("failed to upload video: status %d: %s\n", resp.StatusCode, string(b))
			return
		}
	}

	for {
		status, err := uploadStatus(session.Session.ID)
		if err != nil {
			fmt.Println("failed to get upload status:", err)
			return
		}
		if status.Status == "uploaded" {
			break
		} else if status.Status == "failed" {
			fmt.Println("Upload failed.")
			break
		}
	}

	Fetch(FetchOptions{
		Method: POST,
		Path:   "/api/v1/videos/upload/finish",
		Query: map[string]string{
			"session_id": session.Session.ID,
		},
	})
}

func uploadStatus(sessionID string) (UploadStatus, error) {
	var status UploadStatus
	b, err := FetchRaw(FetchOptions{
		Method: GET,
		Path:   "/api/v1/upload-status",
		Query: map[string]string{
			"session_id": sessionID,
		},
	})
	if err != nil {
		return status, err
	}
	if err := json.Unmarshal(b, &status); err != nil {
		return status, err
	}
	return status, nil
}
