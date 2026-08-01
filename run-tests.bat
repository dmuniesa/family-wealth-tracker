@echo off
echo ============================================
echo   Running all tests
echo ============================================
echo.

echo [1/2] Parser + hash + rules tests
echo --------------------------------------------
node tests/run-tests.js
if %errorlevel% neq 0 (
    echo.
    echo FAILED: run-tests.js
    goto :end
)

echo.
echo [2/2] Insertion tests (in-memory DB)
echo --------------------------------------------
node tests/test-insertions.js
if %errorlevel% neq 0 (
    echo.
    echo FAILED: test-insertions.js
    goto :end
)

echo.
echo ============================================
echo   All tests passed!
echo ============================================
goto :eof

:end
echo.
echo Some tests failed. Check output above.
pause
