package commands

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	. "videoreview-maintenance/internal/lib"
)

func RunUploadVideoEventContext(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	videoId := fs.String("video_rev_id", "", "video revision id")
	jsonPath := fs.String("json_path", "", "path to JSON file containing events array")
	fs.Parse(args)

	if *videoId == "" || *jsonPath == "" {
		fmt.Println("video_rev_id, json_path are required")
		fs.Usage()
		return
	}

	fileBytes, err := os.ReadFile(*jsonPath)
	if err != nil {
		fmt.Println("failed to read json file:", err)
		return
	}

	var events json.RawMessage
	if err := json.Unmarshal(fileBytes, &events); err != nil {
		fmt.Println("failed to parse json file:", err)
		return
	}

	payload := map[string]any{
		"events": events,
	}
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		fmt.Println("failed to encode request body:", err)
		return
	}

	req, err := http.NewRequest("PUT", fmt.Sprintf("%s/api/v1/videos/%s/metadata/upload", GlobalConfig.BaseURL, *videoId), bytes.NewReader(bodyBytes))
	if err != nil {
		fmt.Println("failed to create request:", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-token", GlobalConfig.APIToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println("failed to upload events:", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		fmt.Printf("failed to upload events: status %d: %s\n", resp.StatusCode, string(b))
		return
	}
	fmt.Println("events uploaded successfully")
}
