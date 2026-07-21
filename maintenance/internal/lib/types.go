package lib

import "time"

type HTTPMethod string

const (
	GET   HTTPMethod = "GET"
	POST  HTTPMethod = "POST"
	PUT   HTTPMethod = "PUT"
	PATCH HTTPMethod = "PATCH"
)

type FetchOptions struct {
	Method HTTPMethod
	Path   string
	Query  map[string]string
	Json   any
	Form   map[string]string
}

type UploadSessionWithURL struct {
	URL     string `json:"url"`
	Session struct {
		ID         string    `json:"id"`
		StorageKey string    `json:"storageKey"`
		Storage    string    `json:"storage"`
		Title      string    `json:"title"`
		FolderKey  string    `json:"folderKey"`
		ScenePath  string    `json:"scenePath"`
		NextRev    int       `json:"nextRev"`
		CreatedAt  time.Time `json:"createdAt"`
	} `json:"session"`
}

type UploadStatus struct {
	Status     string `json:"status"`
	RevisionId string `json:"revisionId"`
}

type Video struct {
	ID             string `json:"id"`
	Title          string `json:"title"`
	FolderKey      string `json:"folderKey"`
	ScenePath      string `json:"scenePath"`
	LatestRevision *int   `json:"latestRevisionNum"`
	Deleted        bool   `json:"deleted"`
}
