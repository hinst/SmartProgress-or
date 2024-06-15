package main

import (
	"html/template"
	"net/http"
	"os"
	"strconv"
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
			var filePath = me.dataDirectory + "/" + file.Name() + "/_header.json"
			var theGoal = readJsonFile(filePath, new(goalHeader))
			goals = append(goals, *theGoal)
		}
	}
	return
}

func (me *webApp) getGoalHeader(goalId string) *goalHeader {
	var file = me.dataDirectory + "/" + goalId
	var fileStat, fileError = os.Stat(file)
	if fileError == nil && fileStat.IsDir() {
		var filePath = me.dataDirectory + "/" + fileStat.Name() + "/_header.json"
		return readJsonFile(filePath, new(goalHeader))
	} else {
		return nil
	}
}

func (me *webApp) getGoalNotFoundPage(responseWriter http.ResponseWriter, request *http.Request) {
	responseWriter.WriteHeader(http.StatusNotFound)
	var pageText = me.getLayoutPage(Page{
		Title:   "Goal not found",
		Content: template.HTML("Goal not found"),
	})
	responseWriter.Header().Add(contentType, contentTypeTextHtml)
	responseWriter.Write([]byte(pageText))
}

func (me *webApp) readOffset(responseWriter http.ResponseWriter, request *http.Request) (int, error) {
	var offsetText = request.URL.Query().Get("offset")
	if len(offsetText) > 0 {
		var offset, offsetError = strconv.Atoi(offsetText)
		if offsetError != nil {
			responseWriter.WriteHeader(http.StatusBadRequest)
			responseWriter.Header().Add(contentType, contentTypeText)
			responseWriter.Write([]byte("Offset must be a number"))
			return 0, offsetError
		} else {
			return offset, nil
		}
	} else {
		return 0, nil
	}
}

func (me *webApp) getGoalPage(responseWriter http.ResponseWriter, request *http.Request) {
	var goalId = request.URL.Query().Get("id")
	var offset, offsetError = me.readOffset(responseWriter, request)
	if offsetError != nil {
		return
	}
	var limit = 10

	var goalHeader = me.getGoalHeader(goalId)
	if goalHeader == nil {
		me.getGoalNotFoundPage(responseWriter, request)
		return
	}

	var goalDirectory = me.dataDirectory + "/" + goalId
	var goalDirectoryInfo, goalDirectoryError = os.Stat(goalDirectory)
	if os.IsNotExist(goalDirectoryError) || !goalDirectoryInfo.IsDir() {
		me.getGoalNotFoundPage(responseWriter, request)
		return
	}

	var goalFiles, goalFilesError = os.ReadDir(goalDirectory)
	AssertError(goalFilesError)
	sortFilesByName(goalFiles)
	var goalFileCount = 0
	var pageData = goalPageData{Offset: offset}
	for goalFileIndex, goalFile := range goalFiles {
		if !goalFile.IsDir() {
			goalFileCount++
			if offset <= goalFileIndex && goalFileIndex < offset+limit {
				var goalFile = goalDirectory + "/" + goalFile.Name()
				var post = readJsonFile(goalFile, new(smartPost))
				pageData.Posts = append(pageData.Posts, *post)
			}
		}
	}

	var textBuilder = new(strings.Builder)
	pageData.BaseUrl = me.path
	pageData.prepare()
	AssertError(me.goalTemplate.Execute(textBuilder, pageData))
	var pageText = me.getLayoutPage(Page{
		Title:   goalHeader.Title,
		Content: template.HTML(textBuilder.String()),
	})
	responseWriter.WriteHeader(http.StatusOK)
	responseWriter.Header().Add(contentType, contentTypeTextHtml)
	responseWriter.Write([]byte(pageText))
}
