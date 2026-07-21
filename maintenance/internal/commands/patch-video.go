package commands

import (
	"flag"
	"fmt"
	"strings"
	. "videoreview-maintenance/internal/lib"
)

func RunPatchVideo(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	videoId := fs.String("video_id", "", "video id")
	vcsWatchPaths := fs.String("vcs_watch_paths", "", "comma-separated list of file paths to watch for VCS changes")
	fs.Parse(args)

	if *videoId == "" {
		fmt.Println("video_id is required")
		fs.Usage()
		return
	}

	payload := map[string]any{}

	if *vcsWatchPaths != "" {
		paths := strings.Split(*vcsWatchPaths, ",")
		trimmed := make([]string, 0, len(paths))
		for _, p := range paths {
			if t := strings.TrimSpace(p); t != "" {
				trimmed = append(trimmed, t)
			}
		}
		payload["vcsWatchPaths"] = trimmed
	}

	if len(payload) == 0 {
		fmt.Println("at least one field to update is required (e.g. --vcs_watch_paths)")
		fs.Usage()
		return
	}

	Fetch(FetchOptions{
		Method: PATCH,
		Path:   fmt.Sprintf("/api/v1/videos/%s", *videoId),
		Json:   payload,
	})
}
