package commands

import (
	"flag"
	"fmt"
	. "videoreview-maintenance/internal/lib"
)

func RunGetComments(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	videoId := fs.String("video_id", "", "video id")
	fs.Parse(args)

	if *videoId == "" {
		fmt.Println("videoId is required")
		fs.Usage()
		return
	}

	Fetch(FetchOptions{
		Method: GET,
		Path:   "/api/v1/comments",
		Query: map[string]string{
			"videoId": *videoId,
		},
	})
}
