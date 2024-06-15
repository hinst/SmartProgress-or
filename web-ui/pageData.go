package main

import "html/template"

type indexPageData struct {
	Page
	Goals []goalHeader
}

type goalPageData struct {
	Page
	Id         string
	Offset     int
	OffsetEnd  int
	TotalCount int
	PageSize   int
	Pages      []int
	Posts      []smartPost
}

func (me *goalPageData) prepare() {
	for iPost := range me.Posts {
		me.Posts[iPost].Content = template.HTML(me.Posts[iPost].Msg)
		for iComment := range me.Posts[iPost].Comments {
			me.Posts[iPost].Comments[iComment].Content = template.HTML(me.Posts[iPost].Comments[iComment].Msg)
		}
	}
	var pageCount = me.TotalCount / me.PageSize
	if me.TotalCount%me.PageSize > 0 {
		pageCount++
	}
	me.Pages = nil
	for i := range pageCount {
		me.Pages = append(me.Pages, i*me.PageSize)
	}
	me.OffsetEnd = me.Offset + len(me.Posts)
	me.Offset++
}
