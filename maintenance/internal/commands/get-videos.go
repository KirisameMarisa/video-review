package commands

import (
	"flag"
	. "videoreview-maintenance/internal/lib"
)

func RunGetVideos(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	includeRevisions := fs.String("include_revisions", "false", "include revisions")
	filterTree := fs.String("filter_tree", "", "filter tree")
	fs.Parse(args)
	Fetch(FetchOptions{
		Method: GET,
		Path:   "/api/v1/videos",
		Query: map[string]string{
			"includeRevisions": *includeRevisions,
			"filterTree":       *filterTree,
		},
	})
}
