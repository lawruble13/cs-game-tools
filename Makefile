# JavaScript files
STATIC_JS_FILES := 	$(shell find src -name '*.js')
NODE_JS_FILES :=	$(shell find src/node -name '*.js')
GEN_JS_FILES :=		$(NODE_JS_FILES:src/node/%=src/inject/script/%)
JS_FILES :=			$(STATIC_JS_FILES) $(GEN_JS_FILES)
SOURCE_FILES :=		$(STATIC_JS_FILES) $(NODE_JS_FILES)

# CSS files
SASS_FILES := 		$(shell find src -name '*.scss' -or -name '*.sass')
SASS_PARTIAL :=		$(shell find src -name '_*.scss' -or -name '_*.sass')
GEN_CSS_FILES_2 :=	$(filter-out $(SASS_PARTIAL),$(SASS_FILES))
GEN_CSS_FILES_1 :=	$(GEN_CSS_FILES_2:.sass=.css)
GEN_CSS_FILES :=	$(GEN_CSS_FILES_1:.scss=.css)
STATIC_CSS_FILES :=	$(shell find src -name '*.css')
CSS_FILES :=		$(STATIC_CSS_FILES) $(GEN_CSS_FILES)
SOURCE_FILES := 	$(SOURCE_FILES) $(SASS_FILES) $(STATIC_CSS_FILES)

# Other files
ICON_FILES := 		$(shell find icons -type f)
SOURCE_FILES :=		$(SOURCE_FILES) $(ICON_FILES) Makefile bump_version.zsh package.json package-lock.json
EXTENSION_FILES :=	$(JS_FILES) $(CSS_FILES) $(ICON_FILES) LICENSE manifest.json README.md

.PHONY: all extension css clean source

all: clean source extension

extension: dashingdon-snoop.zip

dashingdon-snoop.zip: $(EXTENSION_FILES) Makefile
	zip $@ $(EXTENSION_FILES) $(SASS_FILES) $(GEN_CSS_FILES:.css=.css.map)

manifest.json: $(SOURCE_FILES) LICENSE README.md
	./bump_version.zsh

css: $(GEN_CSS_FILES)

%.css: %.scss $(SASS_PARTIAL)
	sass $< $@


node_modules: package.json package-lock.json
	npm install

src/inject/script/%.js: src/node/%.js node_modules
	npx browserify $< -o $@ -t babelify --preset @babel/preset-env

src/inject/script/bundle.js: $(NODE_JS_FILES) node_modules
	npx browserify $(NODE_JS_FILES) -o $@ -t babelify --preset @babel/preset-env

clean:
	rm -f $(GEN_CSS_FILES)
	rm -f $(GEN_CSS_FILES:.css=.css.map)
	rm -rf node_modules
	rm -f $(GEN_JS_FILES)
	rm -f dashingdon-snoop.zip
	rm -f source.zip

source: source.zip

source.zip: $(SOURCE_FILES) LICENSE manifest.json README.md
	zip $@ $?
