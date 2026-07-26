#!/bin/bash
set -e
cd "D:/Claude-project/removebg"
git add -A
git commit -m "feat: image background remover MVP" || echo "Already committed"
git push -u origin master
echo "=== PUSH DONE ==="
