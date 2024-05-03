package main

import "html/template"

type indexPageData struct {
	Page
	Goals []goalHeader
}

type goalPageData struct {
	Page
	Goal *goalInfo
}

func (me *goalPageData) prepare() {
	for iPost := range me.Goal.Posts {
		me.Goal.Posts[iPost].Content = template.HTML(me.Goal.Posts[iPost].Msg)
		for iComment := range me.Goal.Posts[iPost].Comments {
			me.Goal.Posts[iPost].Comments[iComment].Content = template.HTML(me.Goal.Posts[iPost].Comments[iComment].Msg)
		}
	}
}
