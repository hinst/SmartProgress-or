package main

type indexPageData struct {
	Page
	Goals []goalHeader
}

type goalPageData struct {
	Page
	Goal *goalInfo
}
