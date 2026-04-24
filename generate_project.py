#!/usr/bin/env python3
"""
Generate a minimal tvOS Xcode project for tvBrowser.
Usage: python generate_project.py
"""

import os
import uuid
import shutil

PROJECT_NAME = "tvBrowser"
BUNDLE_ID = "com.yourname.tvBrowser"
TVOS_DEPLOYMENT_TARGET = "17.0"
SWIFT_VERSION = "6.0"

def gen_uuid():
    return str(uuid.uuid4()).upper().replace("-", "")[:24]

# Collect source files
swift_files = []
js_files = []
for root, dirs, files in os.walk("tvBrowser"):
    for f in files:
        path = os.path.join(root, f)
        if f.endswith(".swift"):
            swift_files.append(path)
        elif f.endswith(".js"):
            js_files.append(path)

swift_files.sort()
js_files.sort()

# Generate UUIDs
project_uuid = gen_uuid()
target_uuid = gen_uuid()
target_build_config_list_uuid = gen_uuid()
project_build_config_list_uuid = gen_uuid()
sources_build_phase_uuid = gen_uuid()
resources_build_phase_uuid = gen_uuid()
frameworks_build_phase_uuid = gen_uuid()
main_group_uuid = gen_uuid()
products_group_uuid = gen_uuid()
sources_group_uuid = gen_uuid()
resources_group_uuid = gen_uuid()
plist_ref_uuid = gen_uuid()
product_ref_uuid = gen_uuid()

file_refs = {}
build_files = {}

for path in swift_files + js_files + ["tvBrowser/Info.plist"]:
    file_refs[path] = gen_uuid()

for path in swift_files:
    build_files[path] = gen_uuid()

# PBXBuildFile section
build_file_section = "/* Begin PBXBuildFile section */\n"
for path in swift_files:
    name = os.path.basename(path)
    build_file_section += f"\t{build_files[path]} /* {name} in Sources */ = {{isa = PBXBuildFile; fileRef = {file_refs[path]} /* {name} */; }};\n"
build_file_section += "/* End PBXBuildFile section */\n"

# PBXFileReference section
file_ref_section = "/* Begin PBXFileReference section */\n"
file_ref_section += f"\t{product_ref_uuid} /* {PROJECT_NAME}.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = {PROJECT_NAME}.app; sourceTree = BUILT_PRODUCTS_DIR; }};\n"
file_ref_section += f"\t{plist_ref_uuid} /* Info.plist */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = \"<group>\"; }};\n"

for path in swift_files:
    name = os.path.basename(path)
    file_ref_section += f"\t{file_refs[path]} /* {name} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = {name}; sourceTree = \"<group>\"; }};\n"

for path in js_files:
    name = os.path.basename(path)
    file_ref_section += f"\t{file_refs[path]} /* {name} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.javascript; path = {name}; sourceTree = \"<group>\"; }};\n"

file_ref_section += "/* End PBXFileReference section */\n"

# PBXFrameworksBuildPhase
frameworks_section = f"""/* Begin PBXFrameworksBuildPhase section */
	{frameworks_build_phase_uuid} /* Frameworks */ = {{
		isa = PBXFrameworksBuildPhase;
		buildActionMask = 2147483647;
		files = (
		);
		runOnlyForDeploymentPostprocessing = 0;
	}};
/* End PBXFrameworksBuildPhase section */
"""

# PBXGroup section - build groups recursively
group_uuids = {}
group_children = {}

def get_group_path(path):
    """Return the group path relative to tvBrowser"""
    if path == "tvBrowser":
        return ""
    return path[len("tvBrowser/"):]

def build_groups():
    # Main group
    group_uuids[""] = main_group_uuid
    group_children[main_group_uuid] = []

    # Products group
    group_uuids["Products"] = products_group_uuid
    group_children[products_group_uuid] = [product_ref_uuid]
    group_children[main_group_uuid].append(products_group_uuid)

    # tvBrowser group (sources root)
    group_uuids["tvBrowser"] = sources_group_uuid
    group_children[sources_group_uuid] = []
    group_children[main_group_uuid].append(sources_group_uuid)

    # Add source files to appropriate groups
    dirs_with_files = {}
    for path in swift_files + js_files + ["tvBrowser/Info.plist"]:
        dir_path = os.path.dirname(path)
        rel_dir = get_group_path(dir_path)
        if rel_dir not in dirs_with_files:
            dirs_with_files[rel_dir] = []
        dirs_with_files[rel_dir].append(path)

    # Create subgroups
    for rel_dir in sorted(dirs_with_files.keys()):
        if not rel_dir:
            # Root of tvBrowser
            parent_uuid = sources_group_uuid
        else:
            parts = rel_dir.split("/")
            current_path = ""
            parent_uuid = sources_group_uuid
            for part in parts:
                current_path = f"{current_path}/{part}" if current_path else part
                if current_path not in group_uuids:
                    group_uuids[current_path] = gen_uuid()
                    group_children[group_uuids[current_path]] = []
                    group_children[parent_uuid].append(group_uuids[current_path])
                parent_uuid = group_uuids[current_path]

        for path in dirs_with_files[rel_dir]:
            group_children[parent_uuid].append(file_refs[path])

    # Also add Info.plist to root
    if "Info.plist" not in [os.path.basename(p) for p in dirs_with_files.get("", [])]:
        group_children[sources_group_uuid].append(plist_ref_uuid)

build_groups()

group_section = "/* Begin PBXGroup section */\n"
for name, guuid in sorted(group_uuids.items(), key=lambda x: x[1]):
    children = group_children.get(guuid, [])
    children_str = ""
    if children:
        children_str = "\n".join([f"\t	\t{child_id}," for child_id in children])
        children_str = "\n" + children_str + "\n\t\t"
    display_name = name if name else PROJECT_NAME
    if name == "":
        display_name = PROJECT_NAME
    group_section += f"""\t{guuid} /* {display_name} */ = {{
\t\tisa = PBXGroup;
\t\tchildren = ({children_str});
\t\tpath = {display_name if name and name != 'tvBrowser' and name != 'Products' else ''};
\t\tsourceTree = "<group>";
\t}};
"""
group_section += "/* End PBXGroup section */\n"

# PBXNativeTarget
native_target_section = f"""/* Begin PBXNativeTarget section */
	{target_uuid} /* {PROJECT_NAME} */ = {{
		isa = PBXNativeTarget;
		buildConfigurationList = {target_build_config_list_uuid} /* Build configuration list for PBXNativeTarget "{PROJECT_NAME}" */;
		buildPhases = (
			{frameworks_build_phase_uuid} /* Frameworks */,
			{sources_build_phase_uuid} /* Sources */,
			{resources_build_phase_uuid} /* Resources */,
		);
		buildRules = (
		);
		dependencies = (
		);
		name = {PROJECT_NAME};
		productName = {PROJECT_NAME};
		productReference = {product_ref_uuid} /* {PROJECT_NAME}.app */;
		productType = "com.apple.product-type.application";
	}};
/* End PBXNativeTarget section */
"""

# PBXProject
project_section = f"""/* Begin PBXProject section */
	{project_uuid} /* Project object */ = {{
		isa = PBXProject;
		buildConfigurationList = {project_build_config_list_uuid} /* Build configuration list for PBXProject "{PROJECT_NAME}" */;
		compatibilityVersion = "Xcode 15.0";
		developmentRegion = en;
		hasScannedForEncodings = 0;
		knownRegions = (
			en,
			Base,
		);
		mainGroup = {main_group_uuid};
		productRefGroup = {products_group_uuid} /* Products */;
		projectDirPath = "";
		projectRoot = "";
		targets = (
			{target_uuid} /* {PROJECT_NAME} */,
		);
	}};
/* End PBXProject section */
"""

# PBXResourcesBuildPhase
resources_section = f"""/* Begin PBXResourcesBuildPhase section */
	{resources_build_phase_uuid} /* Resources */ = {{
		isa = PBXResourcesBuildPhase;
		buildActionMask = 2147483647;
		files = (
		);
		runOnlyForDeploymentPostprocessing = 0;
	}};
/* End PBXResourcesBuildPhase section */
"""

# PBXSourcesBuildPhase
sources_build_phase_content = ""
for path in swift_files:
    name = os.path.basename(path)
    sources_build_phase_content += f"\t	\t{build_files[path]} /* {name} in Sources */,\n"

sources_section = f"""/* Begin PBXSourcesBuildPhase section */
	{sources_build_phase_uuid} /* Sources */ = {{
		isa = PBXSourcesBuildPhase;
		buildActionMask = 2147483647;
		files = (
{sources_build_phase_content}		);
		runOnlyForDeploymentPostprocessing = 0;
	}};
/* End PBXSourcesBuildPhase section */
"""

# XCBuildConfiguration - Debug
debug_build_settings = f"""ASSETCATALOG_COMPILER_APPICON_NAME = "App Icon & Top Shelf Image";
				ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 1;
				GENERATE_INFOPLIST_FILE = YES;
				INFOPLIST_FILE = tvBrowser/Info.plist;
				INFOPLIST_KEY_UILaunchStoryboardName = LaunchScreen;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = 1.0;
				PRODUCT_BUNDLE_IDENTIFIER = {BUNDLE_ID};
				PRODUCT_NAME = "$(TARGET_NAME)";
				SDKROOT = appletvos;
				SWIFT_EMIT_LOC_STRINGS = YES;
				SWIFT_VERSION = {SWIFT_VERSION};
				TARGETED_DEVICE_FAMILY = 3;
				TVOS_DEPLOYMENT_TARGET = {TVOS_DEPLOYMENT_TARGET};"""

debug_project_settings = f"""ALWAYS_SEARCH_USER_PATHS = NO;
				ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS = YES;
				CLANG_ANALYZER_NONNULL = YES;
				CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION = YES_AGGRESSIVE;
				CLANG_CXX_LANGUAGE_STANDARD = "gnu++20";
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				CLANG_ENABLE_OBJC_WEAK = YES;
				CLANG_WARN_BLOCK_CAPTURE_AUTORELEASING = YES;
				CLANG_WARN_BOOL_CONVERSION = YES;
				CLANG_WARN_COMMA = YES;
				CLANG_WARN_CONSTANT_CONVERSION = YES;
				CLANG_WARN_DEPRECATED_OBJC_IMPLEMENTATIONS = YES;
				CLANG_WARN_DIRECT_OBJC_ISA_USAGE = YES_ERROR;
				CLANG_WARN_DOCUMENTATION_COMMENTS = YES;
				CLANG_WARN_EMPTY_BODY = YES;
				CLANG_WARN_ENUM_CONVERSION = YES;
				CLANG_WARN_INFINITE_RECURSION = YES;
				CLANG_WARN_INT_CONVERSION = YES;
				CLANG_WARN_NON_LITERAL_NULL_CONVERSION = YES;
				CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF = YES;
				CLANG_WARN_OBJC_LITERAL_CONVERSION = YES;
				CLANG_WARN_OBJC_ROOT_CLASS = YES_ERROR;
				CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER = YES;
				CLANG_WARN_RANGE_LOOP_ANALYSIS = YES;
				CLANG_WARN_STRICT_PROTOTYPES = YES;
				CLANG_WARN_SUSPICIOUS_MOVE = YES;
				CLANG_WARN_UNGUARDED_AVAILABILITY = YES_AGGRESSIVE;
				CLANG_WARN_UNREACHABLE_CODE = YES;
				CLANG_WARN__DUPLICATE_METHOD_MATCH = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = dwarf;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				ENABLE_TESTABILITY = YES;
				ENABLE_USER_SCRIPT_SANDBOXING = NO;
				GCC_C_LANGUAGE_STANDARD = gnu17;
				GCC_DYNAMIC_NO_PIC = NO;
				GCC_NO_COMMON_BLOCKS = YES;
				GCC_OPTIMIZATION_LEVEL = 0;
				GCC_PREPROCESSOR_DEFINITIONS = (
					"DEBUG=1",
					"$(inherited)",
				);
				GCC_WARN_64_TO_32_BIT_CONVERSION = YES;
				GCC_WARN_ABOUT_RETURN_TYPE = YES_ERROR;
				GCC_WARN_UNDECLARED_SELECTOR = YES;
				GCC_WARN_UNINITIALIZED_AUTOS = YES_AGGRESSIVE;
				GCC_WARN_UNUSED_FUNCTION = YES;
				GCC_WARN_UNUSED_VARIABLE = YES;
				LOCALIZATION_PREFERS_STRING_CATALOGS = YES;
				MTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;
				MTL_FAST_MATH = YES;
				ONLY_ACTIVE_ARCH = YES;
				SDKROOT = appletvos;
				SWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEBUG $(inherited)";
				SWIFT_OPTIMIZATION_LEVEL = "-Onone";
				TVOS_DEPLOYMENT_TARGET = {TVOS_DEPLOYMENT_TARGET};"""

debug_target_config_uuid = gen_uuid()
release_target_config_uuid = gen_uuid()
debug_project_config_uuid = gen_uuid()
release_project_config_uuid = gen_uuid()

build_config_section = f"""/* Begin XCBuildConfiguration section */
	{debug_target_config_uuid} /* Debug */ = {{
		isa = XCBuildConfiguration;
		buildSettings = {{
			{debug_build_settings}
		}};
		name = Debug;
	}};
	{release_target_config_uuid} /* Release */ = {{
		isa = XCBuildConfiguration;
		buildSettings = {{
			{debug_build_settings}
		}};
		name = Release;
	}};
	{debug_project_config_uuid} /* Debug */ = {{
		isa = XCBuildConfiguration;
		buildSettings = {{
			{debug_project_settings}
		}};
		name = Debug;
	}};
	{release_project_config_uuid} /* Release */ = {{
		isa = XCBuildConfiguration;
		buildSettings = {{
			{debug_project_settings}
			COPY_PHASE_STRIP = YES;
			DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
			ENABLE_NS_ASSERTIONS = NO;
			GCC_OPTIMIZATION_LEVEL = s;
			MTL_ENABLE_DEBUG_INFO = NO;
			SWIFT_COMPILATION_MODE = wholemodule;
			SWIFT_OPTIMIZATION_LEVEL = "-O";
			VALIDATE_PRODUCT = YES;
		}};
		name = Release;
	}};
/* End XCBuildConfiguration section */
"""

# XCConfigurationList
target_config_list_section = f"""/* Begin XCConfigurationList section */
	{target_build_config_list_uuid} /* Build configuration list for PBXNativeTarget "{PROJECT_NAME}" */ = {{
		isa = XCConfigurationList;
		buildConfigurations = (
			{debug_target_config_uuid} /* Debug */,
			{release_target_config_uuid} /* Release */,
		);
		defaultConfigurationIsVisible = 0;
		defaultConfigurationName = Release;
	}};
	{project_build_config_list_uuid} /* Build configuration list for PBXProject "{PROJECT_NAME}" */ = {{
		isa = XCConfigurationList;
		buildConfigurations = (
			{debug_project_config_uuid} /* Debug */,
			{release_project_config_uuid} /* Release */,
		);
		defaultConfigurationIsVisible = 0;
		defaultConfigurationName = Release;
	}};
/* End XCConfigurationList section */
"""

# Assemble pbxproj
pbxproj_content = f"""// !$*UTF8*$!
{{
	archiveVersion = 1;
	classes = {{
	}};
	objectVersion = 56;
	objects = {{

{build_file_section}
{file_ref_section}
{frameworks_section}
{group_section}
{native_target_section}
{project_section}
{resources_section}
{sources_section}
{build_config_section}
{target_config_list_section}
	}};
	rootObject = {project_uuid} /* Project object */;
}}
"""

# Write project
project_dir = f"{PROJECT_NAME}.xcodeproj"
os.makedirs(project_dir, exist_ok=True)

with open(os.path.join(project_dir, "project.pbxproj"), "w") as f:
    f.write(pbxproj_content)

# Create xcuserdata to prevent Xcode from complaining
os.makedirs(os.path.join(project_dir, "xcuserdata"), exist_ok=True)

# Create Info.plist
info_plist = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
	<key>CFBundleShortVersionString</key>
	<string>$(MARKETING_VERSION)</string>
	<key>CFBundleVersion</key>
	<string>$(CURRENT_PROJECT_VERSION)</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>UIApplicationSceneManifest</key>
	<dict>
		<key>UIApplicationSupportsMultipleScenes</key>
		<true/>
	</dict>
	<key>UILaunchScreen</key>
	<dict/>
	<key>UIRequiredDeviceCapabilities</key>
	<array>
		<string>arm64</string>
	</array>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
</dict>
</plist>
"""

with open("tvBrowser/Info.plist", "w") as f:
    f.write(info_plist)

# Create Assets.xcassets placeholder
assets_dir = "tvBrowser/Assets.xcassets"
os.makedirs(assets_dir, exist_ok=True)
os.makedirs(os.path.join(assets_dir, "App Icon & Top Shelf Image.brandassets"), exist_ok=True)

contents_json = '{"info":{"author":"xcode","version":1}}'
with open(os.path.join(assets_dir, "Contents.json"), "w") as f:
    f.write(contents_json)
with open(os.path.join(assets_dir, "App Icon & Top Shelf Image.brandassets", "Contents.json"), "w") as f:
    f.write(contents_json)

print(f"Generated {project_dir}/")
print(f"Files: {len(swift_files)} Swift, {len(js_files)} JS")
print("\nNext steps:")
print(f"1. Open {project_dir} in Xcode")
print("2. Select your Team in Signing & Capabilities")
print("3. Build and run on Apple TV simulator")
