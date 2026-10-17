import sys
import os

# Ensure backend directory is in Python path for imports
current_dir = os.path.dirname(__file__)
backend_dir = os.path.abspath(os.path.join(current_dir, "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
