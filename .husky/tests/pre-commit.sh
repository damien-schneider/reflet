#!/bin/sh
set -eu
hook="$(git rev-parse --show-toplevel)/.husky/pre-commit"
sandbox=$(mktemp -d)
trap 'rm -rf "$sandbox"' EXIT
cd "$sandbox"
git init -q
git config user.name 'Hook test'
git config user.email 'hook@example.test'
git config core.hooksPath /dev/null
mkdir -p bin packages/backend
printf '#!/bin/sh\nexit 1\n' > bin/bun
chmod +x bin/bun
export PATH="$sandbox/bin:$PATH"
printf 'original\n' > example.txt
git add example.txt
git commit -qm initial
printf 'backup\n' > example.txt
git stash push -qm existing-backup
backup=$(git rev-parse refs/stash)
printf 'staged\n' > example.txt
git add example.txt
printf 'unstaged\n' >> example.txt
cp example.txt expected.txt
if sh "$hook"; then
  echo 'Hook accepted a failed check' >&2
  exit 1
fi
cmp example.txt expected.txt
test "$(git show :example.txt)" = staged
test "$(git rev-parse refs/stash)" = "$backup"
printf '#!/bin/sh\nexit 0\n' > bin/bun
sh "$hook"
cmp example.txt expected.txt
test "$(git show :example.txt)" = staged
test "$(git rev-parse refs/stash)" = "$backup"
echo 'Commit hook preserves unstaged changes, staging and existing stashes on failure and success.'
