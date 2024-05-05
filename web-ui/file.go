package main

import (
	"encoding/json"
	"os"
)

func readJsonFile[T any](filePath string, receiver T) T {
	var fileContent = AssertResultError(os.ReadFile(filePath))
	AssertError(json.Unmarshal(fileContent, receiver))
	return receiver
}
