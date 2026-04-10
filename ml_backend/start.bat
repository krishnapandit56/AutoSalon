@echo off
echo Starting Flask ML Backend...
cd /d "%~dp0"
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo Virtual environment not found. Please wait for the setup to complete.
    pause
    exit /b 1
)
python app.py
pause
