package main

import (
	"io/fs"
	"slices"
)

func sortFilesByName(files []fs.DirEntry) {
	slices.SortFunc(files, func(a fs.DirEntry, b fs.DirEntry) int {
		if a.Name() < b.Name() {
			return -1
		} else if a.Name() == b.Name() {
			return 0
		} else {
			return 1
		}
	})
}
