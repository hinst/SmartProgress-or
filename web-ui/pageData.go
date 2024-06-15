package main

import "html/template"

type indexPageData struct {
	Page
	Goals []goalHeader
}

type goalPageData struct {
	Page
	Posts []smartPost
}

func (me *goalPageData) prepare() {
	for iPost := range me.Posts {
		me.Posts[iPost].Content = template.HTML(me.Posts[iPost].Msg)
		for iComment := range me.Posts[iPost].Comments {
			me.Posts[iPost].Comments[iComment].Content = template.HTML(me.Posts[iPost].Comments[iComment].Msg)
		}
	}
}
