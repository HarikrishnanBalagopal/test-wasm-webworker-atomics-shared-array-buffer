package main

import (
	"fmt"
)

//go:wasmimport mym2kmodule ask_question
func ask_question() int32

func main() {
	fmt.Println("wasm start")
	fmt.Println("wasm ask a question")
	port := ask_question()
	fmt.Printf("wasm got an answer to the question %d\n", port)
	fmt.Println("wasm end")
}
