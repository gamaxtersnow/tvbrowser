from pathlib import Path
import subprocess

Import("env")


def merge_wokwi_firmware(source, target, env):
    build_dir = Path(env.subst("$BUILD_DIR"))
    esptool = Path(env.PioPlatform().get_package_dir("tool-esptoolpy")) / "esptool.py"
    output = build_dir / "firmware-merged.bin"
    command = [
        env.subst("$PYTHONEXE"),
        str(esptool),
        "--chip",
        "esp32",
        "merge_bin",
        "-o",
        str(output),
        "0x1000",
        str(build_dir / "bootloader.bin"),
        "0x8000",
        str(build_dir / "partitions.bin"),
        "0x10000",
        str(build_dir / "firmware.bin"),
    ]
    subprocess.check_call(command)


env.AddPostAction("$BUILD_DIR/${PROGNAME}.bin", merge_wokwi_firmware)
