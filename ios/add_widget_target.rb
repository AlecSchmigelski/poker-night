# Adds the Live Activity widget extension to the Capacitor-generated project.
#
# Done through the xcodeproj gem rather than by editing project.pbxproj, which
# is a graph of cross-referenced UUIDs and very easy to corrupt by hand.
#
# Idempotent: running it again on a project that already has the target is a
# no-op, which matters because `npx cap sync` is run constantly.

require 'xcodeproj'

PROJECT  = File.expand_path('~/Documents/poker-night/ios/App/App.xcodeproj')
TARGET   = 'PitBossWidget'
APP_ID   = 'com.alecschmigelski.pitboss'
TEAM     = 'V9SA46NL4G'
WIDGET_DIR = File.expand_path('~/Documents/poker-night/ios/App/PitBossWidget')

project = Xcodeproj::Project.open(PROJECT)
app = project.targets.find { |t| t.name == 'App' } or abort 'no App target'

# Settings are re-applied every run, not just on creation: a setting that is
# wrong only shows up as "Invalid placeholder attributes" at install time, long
# after the build said it succeeded.
existing = project.targets.find { |t| t.name == TARGET }
widget = existing || project.new_target(
  :app_extension, TARGET, :ios, '16.2', nil, :swift
)
fresh = existing.nil?

# Source files. PitBossAttributes is compiled into BOTH targets: the app
# constructs it, the extension renders it, and a shared type that drifts is the
# classic way for an activity to start and then show nothing.
group = project['PitBossWidget'] || project.new_group(TARGET, 'PitBossWidget')
%w[PitBossAttributes.swift PitBossLiveActivity.swift PitBossWidgetBundle.swift].each do |name|
  next unless fresh
  ref = group.new_reference(File.join(WIDGET_DIR, name))
  widget.add_file_references([ref])
  app.add_file_references([ref]) if name == 'PitBossAttributes.swift'
end
plist_ref = group.new_reference(File.join(WIDGET_DIR, 'Info.plist'))

# The plugin lives in the app target, next to the rest of the app's Swift.
app_group = project.main_group['App'] || project.main_group
# ViewController registers the plugin with the bridge; without it the plugin
# is compiled and never reachable from JS.
%w[LiveActivityPlugin.swift ViewController.swift].each do |name|
  path = File.expand_path("~/Documents/poker-night/ios/App/App/#{name}")
  next if app.source_build_phase.files_references.any? { |r| r.path.to_s.include?(name) }
  app.add_file_references([app_group.new_reference(path)])
end

widget.build_configurations.each do |config|
  s = config.build_settings
  s['PRODUCT_NAME'] = '$(TARGET_NAME)'
  s['PRODUCT_BUNDLE_IDENTIFIER'] = "#{APP_ID}.widget"
  s['DEVELOPMENT_TEAM'] = TEAM
  s['CODE_SIGN_STYLE'] = 'Automatic'
  s['INFOPLIST_FILE'] = 'PitBossWidget/Info.plist'
  s['IPHONEOS_DEPLOYMENT_TARGET'] = '16.2'
  s['SWIFT_VERSION'] = '5.0'
  s['TARGETED_DEVICE_FAMILY'] = '1,2'
  s['SKIP_INSTALL'] = 'YES'
  s['GENERATE_INFOPLIST_FILE'] = 'NO'
  # The plist interpolates these. Unset, they resolve to empty, the keys are
  # dropped, and the install fails with "Invalid placeholder attributes" —
  # which says nothing about versions.
  s['MARKETING_VERSION'] = '1.0'
  s['CURRENT_PROJECT_VERSION'] = '1'
  s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks',
                                  '@executable_path/../../Frameworks']
end

# WidgetKit and SwiftUI must be linked explicitly; an app extension does not
# inherit the app's frameworks.
frameworks = project.frameworks_group
if fresh
%w[WidgetKit SwiftUI ActivityKit].each do |fw|
  ref = frameworks.new_file("System/Library/Frameworks/#{fw}.framework")
  ref.source_tree = 'SDKROOT'
  widget.frameworks_build_phase.add_file_reference(ref)
end
end

# Embed the extension in the app, or it builds and then simply is not there.
embed = app.build_phases.find do |p|
  p.respond_to?(:name) && p.name == 'Embed Foundation Extensions'
end
embed ||= begin
  phase = project.new(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase)
  phase.name = 'Embed Foundation Extensions'
  phase.symbol_dst_subfolder_spec = :plug_ins
  app.build_phases << phase
  phase
end
build_file = embed.add_file_reference(widget.product_reference, true)
build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
app.add_dependency(widget)

# `npx cap add ios` regenerates SceneDelegate, which drops the subclass and
# silently unregisters the plugin. Re-apply it here so a regeneration is one
# command away from correct rather than a confusing debugging session.
scene = File.expand_path('~/Documents/poker-night/ios/App/App/SceneDelegate.swift')
text = File.read(scene)
if text.include?('rootViewController = CAPBridgeViewController()')
  File.write(scene, text.sub('rootViewController = CAPBridgeViewController()',
                             'rootViewController = ViewController()'))
  puts 'SceneDelegate: repointed at ViewController'
end

project.save
puts "added #{TARGET} (#{APP_ID}.widget)"
puts "app target sources: #{app.source_build_phase.files.count}"
puts "widget sources:     #{widget.source_build_phase.files.count}"
