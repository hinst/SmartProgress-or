package main

import "html/template"

type Page struct {
	Title   string
	Content template.HTML
}
