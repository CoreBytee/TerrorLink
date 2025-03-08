git reset --hard
git fetch
git checkout $GIT_BRANCH
git pull

# Install dependencies
bun i --production

# Start the application
export FORCE_COLOR=1
bun run . 2>&1 | tee -a latest.log