#!/bin/bash
# Daily Learning Content Generator - Run Script

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Daily Learning Content Generator${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python 3 is required but not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Python 3 found${NC}"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pip install -q --upgrade pip
pip install -q -r requirements.txt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Running Content Generator${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Parse command line arguments
ROADMAP="${1:-all}"
LIMIT_DAYS="${2:-}"
DRY_RUN="${3:-false}"
NO_AI="${4:-}"

# Build command
CMD="python generator.py --roadmap $ROADMAP"

if [ ! -z "$LIMIT_DAYS" ]; then
    CMD="$CMD --limit-days $LIMIT_DAYS"
fi

if [ "$DRY_RUN" == "true" ]; then
    CMD="$CMD --dry-run true"
fi

if [ "$NO_AI" == "--no-ai" ]; then
    CMD="$CMD --no-ai"
fi

echo -e "${YELLOW}Command: $CMD${NC}"
echo ""

# Run the generator
$CMD

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ Content generation completed!${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}✗ Content generation failed${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi

# Deactivate virtual environment
deactivate
