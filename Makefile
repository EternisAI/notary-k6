install:
	brew install k6

test:
	k6 run notary-load-test.js