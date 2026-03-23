.PHONY: setup hooks

setup: hooks
	cd backend && poetry install
	cd frontend && npm install

hooks:
	git config core.hooksPath .hooks
	chmod +x .hooks/pre-commit
