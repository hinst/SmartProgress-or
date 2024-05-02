package main

import (
	"html/template"
	"time"
)

type goalHeader struct {
	Id        string    `json:"id"`
	Title     string    `json:"title"`
	PostCount int       `json:"postCount"`
	UpdatedAt time.Time `json:"updatedAt"`
	Author    string    `json:"author"`
}

type smartPost struct {
	Id       string        `json:"id"`
	Msg      string        `json:"msg"`
	Date     string        `json:"date"`
	Username string        `json:"username"`
	Type     string        `json:"type"`
	Content  template.HTML `json:"-"`
}

type goalInfo struct {
	Id    string      `json:"id"`
	Title string      `json:"title"`
	Posts []smartPost `json:"posts"`
}
