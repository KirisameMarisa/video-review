package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	if len(os.Args) > 1 {
		handleURL(os.Args[1])
		return
	}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		url := r.URL.Query().Get("url")
		if url == "" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		handleURL(url)
	})

	log.Println("VideoReview launcher listening on :18765")
	log.Fatal(http.ListenAndServe("127.0.0.1:18765", nil))
}

func handleURL(raw string) {
	fmt.Println("received:", raw)
	// TODO: parse & dispatch
}
