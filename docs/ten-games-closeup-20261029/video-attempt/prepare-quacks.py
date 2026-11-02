"""Validate Quacks frozen private annotation without repository GT literals."""
import runpy,sys
from pathlib import Path
sys.argv=[__file__,'quacks-inputs.json']
runpy.run_path(str(Path(__file__).with_name('prepare-pilot.py')),run_name='__main__')
