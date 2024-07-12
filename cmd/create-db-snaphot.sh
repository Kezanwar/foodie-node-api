# ---- Prerequisites

# must have mongo-db & mongofb-database-tools install to run this 

# $ brew tap mongodb/brew
# $ brew install mongodb-database-tools

# must have env configured with a valid MONGO_URI env variable
# must have /snapshots folder
# must be called from root


. ./.env

date=$(date '+%d-%m-%Y')

mongodump --uri=$MONGO_URI --out=snapshots/$date --gzip
