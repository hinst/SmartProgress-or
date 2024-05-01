package main

import (
	"log"
	"net/http"
)

func main() {
	log.Println("Starting...")
	var webApp = &webApp{
		path:               "/smartProgress-or",
		dataDirectory:      "data",
		templatesDirectory: "templates",
	}
	webApp.Start()
	AssertError(http.ListenAndServe(":8080", nil))
}
