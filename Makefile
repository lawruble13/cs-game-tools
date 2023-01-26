JS_FILES := 		$(shell find src -name '*.js')
SASS_FILES := 		$(shell find src -name '*.scss' -or -name '*.sass')
SASS_PARTIAL :=		$(shell find src -name '_*.scss' -or -name '_*.sass')
GEN_CSS_FILES_2 :=	$(filter-out $(SASS_PARTIAL),$(SASS_FILES))
GEN_CSS_FILES_1 :=	$(GEN_CSS_FILES_2:.sass=.css)
GEN_CSS_FILES :=	$(GEN_CSS_FILES_1:.scss=.css)
STATIC_CSS_FILES :=	$(shell find src -name '*.css')
CSS_FILES :=		$(STATIC_CSS_FILES) $(GEN_CSS_FILES)
ICON_FILES := 		$(shell find icons -type f)
SOURCE_FILES :=		$(JS_FILES) $(SASS_FILES) $(STATIC_CSS_FILES) $(ICON_FILES) Makefile bump_version.zsh
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

clean:
	rm -f $(GEN_CSS_FILES)
	rm -f $(GEN_CSS_FILES:.css=.css.map)
	rm -f dashingdon-snoop.zip
	rm -f source.zip

source: source.zip

source.zip: $(SOURCE_FILES) LICENSE manifest.json README.md
	zip $@ $?
