package main

import (
	"encoding/json"
	"html/template"
	"net/http"
	"os"
	"strings"
)

type webApp struct {
	path               string
	dataDirectory      string
	templatesDirectory string
}

func (me *webApp) Start() {
	http.HandleFunc(me.path, me.getMainPage)
}

func (me *webApp) getLayoutPage(page Page) string {
	var layoutTemplate = AssertResultError(
		template.New("layout.html").ParseGlob(me.templatesDirectory + "/*"))
	var buffer = new(strings.Builder)
	AssertError(layoutTemplate.Execute(buffer, page))
	return buffer.String()
}

func (me *webApp) getMainPage(writer http.ResponseWriter, request *http.Request) {
	var textBuilder = new(strings.Builder)
	var indexTemplate = AssertResultError(
		template.New("index.html").ParseGlob(me.templatesDirectory + "/*"))
	AssertError(indexTemplate.Execute(textBuilder, indexPageData{
		Goals: me.getGoals(),
	}))

	var pageText = me.getLayoutPage(Page{
		Title:   "Goals",
		Content: template.HTML(textBuilder.String()),
	})
	writer.Write([]byte(pageText))
}

func (me *webApp) getGoals() (goals []goalHeader) {
	var files = AssertResultError(os.ReadDir(me.dataDirectory))
	for _, file := range files {
		var filePath = me.dataDirectory + "/" + file.Name()
		var fileContent = AssertResultError(os.ReadFile(filePath))
		var theGoal = new(goalHeader)
		AssertError(json.Unmarshal(fileContent, theGoal))
		goals = append(goals, *theGoal)
	}
	return
}
