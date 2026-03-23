.PHONY: setup hooks

setup: hooks
	cd dough_flow_api && poetry install
	cd dough_flow_ui && npm install

hooks:
	git config core.hooksPath .hooks
	chmod +x .hooks/pre-commit
