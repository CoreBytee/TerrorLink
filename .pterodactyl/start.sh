git reset --hard
git fetch
git checkout $GIT_BRANCH
git pull

# Install dependencies
bun i --production

# Start the application
export FORCE_COLOR=1
export NODE_ENV=production
bun run prod:server 2>&1 | tee -a latest.log