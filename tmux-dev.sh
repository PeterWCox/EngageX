#!/bin/bash

# Tmux development session setup for Twitter Extension

SESSION_NAME="twitter-ext"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Enable mouse support globally (for all sessions)
tmux set -g mouse on 2>/dev/null || true

# Enable system clipboard integration
tmux set-option -g set-clipboard on 2>/dev/null || true

# Make copy-mode use system clipboard (for macOS)
tmux bind -T copy-mode-vi y send -X copy-pipe-and-cancel "pbcopy" 2>/dev/null || true
tmux bind -T copy-mode-vi Enter send -X copy-pipe-and-cancel "pbcopy" 2>/dev/null || true

# Kill existing session if it exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Killing existing session $SESSION_NAME..."
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
fi

# Create new session with main window
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_DIR"

# Split window horizontally to create left (build) and right (manifest watcher) sections
tmux split-window -h -t "$SESSION_NAME:0" -c "$PROJECT_DIR" -l 70%

# Build pane (left, 70% width) - Hot reload build
tmux send-keys -t "$SESSION_NAME:0.0" "cd $PROJECT_DIR" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo 'Cleaning dist directory...'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "rm -rf dist" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo 'Starting Chrome Extension build (watch mode)...'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "npm run dev" C-m
tmux select-pane -t "$SESSION_NAME:0.0" -T "Build (Watch)"

# Manifest watcher pane (right, 30% width)
tmux send-keys -t "$SESSION_NAME:0.1" "cd $PROJECT_DIR" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo 'Starting manifest watcher...'" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "npm run dev:watch" C-m
tmux select-pane -t "$SESSION_NAME:0.1" -T "Manifest Watcher"

# Focus on build pane (left)
tmux select-pane -t "$SESSION_NAME:0.0"

# Attach to session
tmux attach-session -t "$SESSION_NAME"

