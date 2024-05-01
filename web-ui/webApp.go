package main

import (
	"html/template"
	"net/http"
)

type webApp struct {
	path               string
	dataDirectory      string
	templatesDirectory string
}

func (me *webApp) Start() {
	http.HandleFunc(me.path, me.getMainPage)
}

func (me *webApp) getMainPage(writer http.ResponseWriter, request *http.Request) {
	var indexTemplate = AssertResultError(
		template.New("index.html").ParseGlob(me.templatesDirectory + "/*"))
	AssertError(indexTemplate.Execute(writer, nil))
}
