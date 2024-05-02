package main

import "time"

type goalHeader struct {
	Id        string    `json:"id"`
	Title     string    `json:"title"`
	PostCount int       `json:"postCount"`
	UpdatedAt time.Time `json:"updatedAt"`
	Author    string    `json:"author"`
}
