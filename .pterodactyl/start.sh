git reset --hard
git fetch
git checkout $GIT_BRANCH
git pull

# Upgrade bun
bun upgrade

# Install dependencies
bun i --production

# Start the application
export FORCE_COLOR=1
bun run prod:server 2>&1 | tee -a latest.log