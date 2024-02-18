BIN_DIR=bin
BIN_NAME=main.wasm
WAT_NAME=main.wat

.PHONY: clean
clean:
	rm -rf ${BIN_DIR}

.PHONY: build
build:
	mkdir -p ${BIN_DIR}
	GOOS=wasip1 GOARCH=wasm go build -o ${BIN_DIR}/${BIN_NAME} .
	wasm2wat ${BIN_DIR}/${BIN_NAME} > ${BIN_DIR}/${WAT_NAME}
