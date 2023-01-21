JS_FILES := 		$(shell find src -name '*.js')
SASS_FILES := 		$(shell find src -name '*.scss' -or -name '*.sass')
SASS_PARTIAL :=		$(shell find src -name '_*.scss' -or -name '_*.sass')
GEN_CSS_FILES_2 :=	$(filter-out $(SASS_PARTIAL),$(SASS_FILES))
GEN_CSS_FILES_1 :=	$(GEN_CSS_FILES_2:.sass=.css)
GEN_CSS_FILES :=	$(GEN_CSS_FILES_1:.scss=.css)
CSS_FILES :=		$(shell find src -name '*.css') $(GEN_CSS_FILES)
ICON_FILES := 		$(shell find icons -type f)
EXTENSION_FILES :=	$(JS_FILES) $(CSS_FILES) $(ICON_FILES) LICENSE manifest.json README.md

.PHONY: extension css clean

extension: dashingdon-snoop.zip

dashingdon-snoop.zip: manifest.json Makefile
	zip $@ $(EXTENSION_FILES) manifest.json

manifest.json: $(filter-out manifest.json,$(EXTENSION_FILES))
	./bump_version.zsh

css: $(GEN_CSS_FILES)

%.css: %.scss $(SASS_PARTIAL)
	sass $< $@

clean:
	rm -f $(GEN_CSS_FILES)
	rm -f $(GEN_CSS_FILES:.css=.css.map)
	rm -f dashingdon-snoop.zip
