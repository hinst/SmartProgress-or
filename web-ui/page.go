package main

import "html/template"

type Page struct {
	BaseUrl string
	Title   string
	Content template.HTML
}
