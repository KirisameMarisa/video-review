package commands

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"time"
	. "videoreview-maintenance/internal/lib"
)

type warmCacheResult struct {
	Days struct {
		Total   int      `json:"total"`
		Fetched int      `json:"fetched"`
		Skipped int      `json:"skipped"`
		Failed  int      `json:"failed"`
		Errors  []string `json:"errors,omitempty"`
	} `json:"days"`
	Range struct {
		From string `json:"from"`
		To   string `json:"to"`
	} `json:"range"`
}

func RunWarmVCSCache(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	days := fs.Int("days", 0, "Pre-cache the last N days (alternative to --from/--to)")
	from := fs.String("from", "", "Start datetime in ISO 8601 (e.g. 2026-03-01T00:00:00Z)")
	to := fs.String("to", "", "End datetime in ISO 8601 (e.g. 2026-04-01T00:00:00Z)")
	refresh := fs.Bool("refresh", false, "Re-fetch all days even if already cached")
	fs.Parse(args)

	var fromTime, toTime time.Time

	switch {
	case *days > 0:
		toTime = time.Now().UTC()
		fromTime = toTime.AddDate(0, 0, -*days)
	case *from != "" && *to != "":
		var err error
		fromTime, err = time.Parse(time.RFC3339, *from)
		if err != nil {
			fmt.Fprintf(os.Stderr, "invalid --from: %v\n", err)
			fs.Usage()
			os.Exit(1)
		}
		toTime, err = time.Parse(time.RFC3339, *to)
		if err != nil {
			fmt.Fprintf(os.Stderr, "invalid --to: %v\n", err)
			fs.Usage()
			os.Exit(1)
		}
	default:
		fmt.Fprintln(os.Stderr, "either --days or both --from and --to are required")
		fs.Usage()
		os.Exit(1)
	}

	if !fromTime.Before(toTime) {
		fmt.Fprintln(os.Stderr, "--from must be before --to")
		os.Exit(1)
	}

	fmt.Printf("Warming VCS cache: %s → %s\n", fromTime.Format(time.RFC3339), toTime.Format(time.RFC3339))

	body, err := FetchRaw(FetchOptions{
		Method: POST,
		Path:   "/api/v1/admin/vcs/warm-cache",
		Json: map[string]any{
			"from":    fromTime.Format(time.RFC3339),
			"to":      toTime.Format(time.RFC3339),
			"refresh": *refresh,
		},
	})
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	var result warmCacheResult
	if err := json.Unmarshal(body, &result); err != nil {
		fmt.Fprintln(os.Stderr, "failed to parse response:", err)
		os.Stdout.Write(body)
		return
	}

	fmt.Printf("Days: total=%-4d fetched=%-4d skipped=%-4d failed=%d\n",
		result.Days.Total, result.Days.Fetched, result.Days.Skipped, result.Days.Failed)
	for _, e := range result.Days.Errors {
		fmt.Fprintf(os.Stderr, "  error: %s\n", e)
	}

	if result.Days.Failed > 0 {
		os.Exit(1)
	}
}
