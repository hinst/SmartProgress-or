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

	indexTemplate    *template.Template
	layoutTemplate   *template.Template
	notFoundTemplate *template.Template
	goalTemplate     *template.Template
}

func (me *webApp) Start() {
	me.loadTemplates()
	me.registerFunctions()
}

func (me *webApp) loadTemplates() {
	me.layoutTemplate = me.loadTemplate("layout.html")
	me.indexTemplate = me.loadTemplate("index.html")
	me.notFoundTemplate = me.loadTemplate("notFound.html")
	me.goalTemplate = me.loadTemplate("goal.html")
}

func (me *webApp) registerFunctions() {
	http.HandleFunc(me.path, me.getMainPage)
	http.HandleFunc(me.path+"/goals", me.getGoalPage)
}

func (me *webApp) loadTemplate(fileName string) *template.Template {
	return AssertResultError(template.New(fileName).ParseGlob(me.templatesDirectory + "/*"))
}

func (me *webApp) getLayoutPage(page Page) string {
	var buffer = new(strings.Builder)
	page.BaseUrl = me.path
	AssertError(me.layoutTemplate.Execute(buffer, page))
	return buffer.String()
}

func (me *webApp) getMainPage(writer http.ResponseWriter, request *http.Request) {
	var textBuilder = new(strings.Builder)
	var pageData = indexPageData{Goals: me.getGoals()}
	pageData.BaseUrl = me.path
	AssertError(me.indexTemplate.Execute(textBuilder, pageData))
	var pageText = me.getLayoutPage(Page{
		Title:   "Goals",
		Content: template.HTML(textBuilder.String()),
	})
	writer.WriteHeader(http.StatusOK)
	writer.Header().Add(contentType, contentTypeTextHtml)
	writer.Write([]byte(pageText))
}

func (me *webApp) getGoals() (goals []goalHeader) {
	var files = AssertResultError(os.ReadDir(me.dataDirectory))
	for _, file := range files {
		if file.IsDir() {
			continue
		}
		var filePath = me.dataDirectory + "/headers/" + file.Name()
		var fileContent = AssertResultError(os.ReadFile(filePath))
		var theGoal = new(goalHeader)
		AssertError(json.Unmarshal(fileContent, theGoal))
		goals = append(goals, *theGoal)
	}
	return
}

func (me *webApp) getGoalPage(writer http.ResponseWriter, request *http.Request) {
	var goalId = request.URL.Query().Get("id")
	var filePath = me.dataDirectory + "/" + goalId + ".json"
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		writer.WriteHeader(http.StatusNotFound)
		var pageText = me.getLayoutPage(Page{
			Title:   "Goal not found",
			Content: template.HTML("Goal not found"),
		})
		writer.Header().Add(contentType, contentTypeTextHtml)
		writer.Write([]byte(pageText))
	}
	var fileContent = AssertResultError(os.ReadFile(filePath))
	var theGoal = new(goalInfo)
	AssertError(json.Unmarshal(fileContent, theGoal))
	var textBuilder = new(strings.Builder)
	var pageData = goalPageData{Goal: theGoal}
	pageData.BaseUrl = me.path
	pageData.prepare()
	AssertError(me.goalTemplate.Execute(textBuilder, pageData))
	var pageText = me.getLayoutPage(Page{
		Title:   theGoal.Title,
		Content: template.HTML(textBuilder.String()),
	})
	writer.WriteHeader(http.StatusOK)
	writer.Header().Add(contentType, contentTypeTextHtml)
	writer.Write([]byte(pageText))
}
