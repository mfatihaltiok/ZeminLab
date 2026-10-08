@echo off
REM FALUZMN Windows Hızlı Kurulum
REM Bu dosyayı çift tıklayarak çalıştırın

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          FALUZMN Windows Kurulum                          ║
echo ║          Geoteknik Mühendisliği Hesaplama Yazılımı        ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Node.js kontrolü
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [HATA] Node.js bulunamadi!
    echo.
    echo Lutfen Node.js LTS surumunu kurun:
    echo   https://nodejs.org
    echo.
    echo veya winget ile:
    echo   winget install OpenJS.NodeJS.LTS
    echo.
    pause
    exit /b 1
)

echo [1/3] Node.js bulundu
node --version

echo.
echo [2/3] npm bagimliliklari yukleniyor...
echo   Bu islem birkac dakika surebilir...
call npm install
if %errorlevel% neq 0 (
    echo [HATA] npm install basarisiz
    pause
    exit /b 1
)
echo   OK npm bagimliliklari yuklendi

echo.
echo [3/3] Windows installer olusturuluyor...
echo   Bu islem 5-10 dakika surebilir...
call npm run build:win
if %errorlevel% neq 0 (
    echo [HATA] Build basarisiz
    pause
    exit /b 1
)
echo   OK Windows installer olusturuldu

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    KURULUM TAMAMLANDI                     ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Kurulum dosyasi dist klasorunde olusturuldu.
echo.
echo Dosyayi bulmak icin:
echo   dir dist\*.exe
echo.
echo Kurulumu baslatmak icin .exe dosyasini cift tiklayin.
echo.
echo Gelistirme modunda calistirmak icin:
echo   npm run dev
echo.
pause
