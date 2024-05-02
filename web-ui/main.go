package main

import (
	"log"
	"net/http"
)

func main() {
	const listenAddress = ":8080"
	log.Println("Starting at " + listenAddress)
	var webApp = &webApp{
		path:               "/smartProgress-or",
		dataDirectory:      "data",
		templatesDirectory: "templates",
	}
	webApp.Start()
	AssertError(http.ListenAndServe(listenAddress, nil))
}
