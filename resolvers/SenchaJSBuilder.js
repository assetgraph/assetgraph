var path = require('path'),
    fs = require('fs'),
    step = require('step'),
    _ = require('underscore'),
    error = require('../error');

var SenchaJSBuilder = module.exports = function (config) {
    // Expects: config.root, config.body
    _.extend(this, config);

    if (this.version !== 2 && this.version !== 3) {
        throw "SenchaJSBuilder: Unsupported version: " + this.version;
    }

    this.pkgIndex = {};
    if (this.version === 2) {
        this.body.packages = this.body.pkgs;
        delete this.body.pkgs;
    }

    this.body.builds = this.body.builds || [];

    ['packages', 'builds'].forEach(function (sectionName) {
        if (sectionName in this.body) {
            this.body[sectionName].forEach(function (pkg) {
                if (this.version === 2) {
                    pkg.packages = pkg.pkgDeps;
                    pkg.target = pkg.file;
                    delete pkg.file;
                    pkg.files = pkg.fileIncludes.map(function (fileInclude) {
                        return {
                            path: fileInclude.path.replace(/^src\/ext-core/, "../ext-core"), // FIXME
                            name: fileInclude.text
                        };
                    });
                    delete pkg.fileIncludes;
                }
                this.pkgIndex[pkg.name] = this.pkgIndex[pkg.target] = pkg;
                if ('id' in pkg) {
                    this.pkgIndex[pkg.id] = pkg;
                }
            }, this);
       }
    }, this);
};

SenchaJSBuilder.prototype = {
    resolvePkg: function (pkg, cb) {
        var This = this,
            relations = [];
        step(
            function () {
                if (pkg.pkgDeps && pkg.pkgDeps.length > 0) {
                    pkg.pkgDeps.forEach(function (pkgTargetFileName) {
                        var callback = this.parallel();
                        This.resolvePkg(This.pkgIndex[pkgTargetFileName], error.passToFunction(cb, function (pkgRelations) {
                            [].push.apply(relations, pkgRelations);
                            callback();
                        }));
                    }, this);
                } else {
                    process.nextTick(this);
                }
            },
            function () {
                var urls = (pkg.files || []).map(function (fileDef) {
                    return path.join(This.baseUrl, fileDef.path, fileDef.name);
                });
                if (pkg.name === 'Ext Base') {
                    step(
                        function () {
                            var innerGroup = this.group();
                            urls.forEach(function (url) {
                                fs.readFile(path.join(This.root, url), 'utf8', innerGroup());
                            });
                        },
                        error.passToFunction(cb, function (fileBodies) {
                            relations.push({
                                type: 'js',
                                assetPointers: {}, // Huhm...
                                inlineData: fileBodies.join("\n"),
                                originalUrl: path.join(This.baseUrl, pkg.target)
                            });
                            cb(null, relations);
                        })
                    );
               } else {
                    var cssUrls = [];
                    urls.forEach(function (url) {
                        if (/\.css$/.test(url)) {
                            cssUrls.push(url);
                        } else {
                            relations.push({
                                // originalUrl: ...
                                assetPointers: {}, // Huhm...
                                url: url
                            });
                        }
                    });
                    if (!cssUrls.length) {
                        process.nextTick(function () {
                            cb(null, relations);
                        });
                    } else {
                        step(
                            function () {
                                var innerGroup = this.group();
                                cssUrls.forEach(function (cssUrl) {
                                    fs.readFile(path.join(This.root, cssUrl), 'utf8', innerGroup());
                                });
                            },
                            error.passToFunction(cb, function (cssFileBodies) {
                                // Stupid ExtJS 3 has CSS url()s relative to the target paths of their target
                                // bundles, NOT the source files!
                                // Issue reported here: http://www.extjs.com/forum/showthread.php?p=330222
                                // Work around it by around by substituting the url()s:
                                cssFileBodies.forEach(function (cssFileBody, i) {
                                    var relation = {
                                        type: 'css',
                                        originalUrl: path.join(This.baseUrl, cssUrls[i])
                                    };
                                    relation.url = relation.originalUrl;
                                    relation.inlineData = cssFileBody.replace(/\*.*?\*\//g, '').replace(/url\s*\(\s*/g, function () {
                                        delete relation.url; // ... Ehh.. Maybe relation.isDirty=true or relation.originalUrl?
                                        return "url(..";
                                    });
                                    relations.push(relation);
                                });
                                process.nextTick(function () {
                                    cb(null, relations);
                                });
                            })
                        );
                    }
                }
            }
        );
    },

    resolve: function (relation, cb) {
        var pkg = this.pkgIndex[relation.url];
        if (pkg) {
            this.resolvePkg(pkg, cb);
        } else {
            relation.url = path.join(this.baseUrl, relation.url);
            delete relation.label;
            process.nextTick(function () {
                cb(null, [relation]);
            });
        }
    }
};

/*
my $ext_jsb = JSON::XS->new->relaxed->decode($ext_jsb_src);

my %ext_jsb_package_index;
for my $pkg (@{$ext_jsb->{'pkgs'}}) {
    $ext_jsb_package_index{$pkg->{'name'}} = $ext_jsb_package_index{$pkg->{'file'}} = $ext_jsb_package_index{basename($pkg->{'file'})} = $pkg;
}

# Take into account that ext-core might actually be checked out elsewhere
sub rewrite_ext_relative_path {
    my $ext_relative_path = shift;
    if ($ext_relative_path =~ m{^src/ext-core/} && defined($ext_core_base_url)) {
        # The file is part of ext-core which we've been told is found elsewhere:
        my @ext_base_url_fragments = split(/\//, $ext_base_url);
        my $relative_path_to_ext_core = FileUtils::build_path(("..")x(scalar @ext_base_url_fragments), $ext_core_base_url)."/";
        $ext_relative_path =~ s{^src/ext-core/}{$relative_path_to_ext_core};
    }
    return $ext_relative_path;
}

sub get_extjs_package {
    my $package_or_file_name = shift;
    if (my $pkg = $ext_jsb_package_index{$package_or_file_name}) {
        return $pkg;
    }elsif (-e FileUtils::build_path($ProductionBuilder::assets_in_root, $ext_base_url, rewrite_ext_relative_path($package_or_file_name))) {
        # The file exists, make a virtual package (FIXME):
        return {
            fileIncludes => [
                {
                    text => basename($package_or_file_name),
                    path => dirname($package_or_file_name).'/',
                }
            ]
        };
    }else{
        die "Unknown Ext package: $package_or_file_name";
    }
}

my %seen_asset_urls;

sub get_asset_urls_for_extjs_package {
    my ($pkg, $recursive, $only_not_yet_seen) = @_;

    my @dependent_asset_urls;
    if ($recursive) {
        if (my $depends = $pkg->{'pkgDeps'}) {
            for my $depend_file (@$depends) {
                push @dependent_asset_urls, get_asset_urls_for_extjs_package(get_extjs_package($depend_file), $recursive, $only_not_yet_seen);
            }
        }
    }
    my @asset_urls;
    for my $file_include (@{$pkg->{'fileIncludes'}}) {
        my $url = FileUtils::build_path($ext_base_url, rewrite_ext_relative_path($file_include->{'path'}).$file_include->{'text'});
        next if $only_not_yet_seen && $seen_asset_urls{$url}++;
        push @asset_urls, $url;
    }
    if (exists $pkg->{'name'} && $pkg->{'name'} eq 'Ext Base') {
        # Ext Base cannot be included as individual files. The first file starts
        # a (function(){ construct which doesn't end until the end of the last file
        (my $bundle_file_name = $pkg->{'file'}) =~ s/[^a-zA-Z0-9\.]/_/g;
        my $bundle_url = FileUtils::build_path($build_base_url, $bundle_file_name);
        if ($only_not_yet_seen && $seen_asset_urls{$bundle_url}++) {
            @asset_urls = ();
        }else{
            FileUtils::write_file(FileUtils::build_path($ProductionBuilder::assets_in_root, $bundle_url),
                                  join("\n", map {FileUtils::read_file(FileUtils::build_path($ProductionBuilder::assets_in_root, $_))} @asset_urls));
            @asset_urls = ($bundle_url);
        }
    }
    for (my $i=0 ; $i<@asset_urls ; $i++) {
        my $asset_url = $asset_urls[$i];
        if ($asset_url =~ /\.css$/i) {
            my $src = FileUtils::read_file(FileUtils::build_path($ProductionBuilder::assets_in_root, $asset_url));

            $src =~ s{/\*.*?\*()/}{}sg; # Strip comments // Parentheses inserted because of syntax hightlighting

            # Stupid ExtJS 3 has CSS url()s relative to the target paths of their target bundles, NOT the source files!
            # Issue reported here: http://www.extjs.com/forum/showthread.php?p=330222
            # For now this can be hacked around by making a new file with all url()s fixed:

            my $url_prefix = FileUtils::build_relative_path($build_base_url, $ext_base_url, 'resources', 'images');

            if ($src =~ s{url\s*\(\s*}{url($url_prefix/}g) {
                # Substitutions were made, make a new file:
                (my $processed_file_name = $asset_url) =~ s/[^a-zA-Z0-9\.]/_/g;
                my $processed_url = FileUtils::build_path($build_base_url, $processed_file_name);
                FileUtils::write_file(FileUtils::build_path($ProductionBuilder::assets_in_root, $processed_url), $src);
                splice(@asset_urls, $i, 1, $processed_url);
            }
        }
    }
    return (@dependent_asset_urls, @asset_urls);
}

sub get_asset_urls_for_javascript_asset {
    my ($asset, $recursive, $only_not_yet_seen) = @_;
    my @dependency_urls;
    for my $relation ($asset->all_relations_of_class('ProductionBuilder::Relation::JavaScript::Include::Static'),
                      $asset->all_relations_of_class('ProductionBuilder::Relation::JavaScript::Exclude')) {
        my $is_exclude = ref $relation eq 'ProductionBuilder::Relation::JavaScript::Exclude';
        my @urls;

        my ($label, $label_relative_url) = $relation->get_url =~ m/^([\w\-]+):(.*)$/;
        if (defined $label && $label eq 'ext') {
            # FIXME: Maybe generic jsb2 support could be added so that 'ext' doesn't have to be handled as a special case
            push @urls, get_asset_urls_for_extjs_package(get_extjs_package($label_relative_url), $recursive && !$is_exclude, !$is_exclude && $only_not_yet_seen);
        }elsif (defined $label && $label =~ m{^https?$}) {
            my $asset_url = $relation->get_url;
            if ($is_exclude || !$only_not_yet_seen || !$seen_asset_urls{$asset_url}++) {
                push @urls, $asset_url;
            }
        }else{
            my $asset_url = FileUtils::build_path($asset->{'src_base_url'}, $relation->get_resolved_url);
            if ($is_exclude || !$only_not_yet_seen || !$seen_asset_urls{$asset_url}++) {
                if ($recursive) {
                    my $referenced_asset;
                    eval { $referenced_asset = $relation->get_asset; } || die $asset->get_human_readable_src_url.": ".$@;
                    if (ref $referenced_asset eq 'ProductionBuilder::Asset::JavaScript') { # No relations supported in CSS files (yet).
                        push @urls, get_asset_urls_for_javascript_asset($referenced_asset, $recursive && !$is_exclude, !$is_exclude && $only_not_yet_seen);
                    }
                }
                push @urls, $asset_url;
            }
        }
        if ($is_exclude) {
            my $num_removed = 0;
            URL: for my $url (@urls) {
                for (my $i=0 ; $i<@dependency_urls ; $i++) {
                    if ($dependency_urls[$i] eq $url) {
                        splice(@dependency_urls, $i, 1);
                        $num_removed++;
                        next URL;
                    }
                }
            }
            unless ($num_removed) {
                die $asset->get_human_readable_src_url.": one.exclude('".$relation->get_url."') has no effect";
            }
        }else{
            push @dependency_urls, @urls;
        }
    }
    return @dependency_urls;
}

my @stylesheet_urls;

sub make_template_relative_url {
    my $url = shift;
    return $url if $url =~ m{^https?:};
    return FileUtils::build_relative_path($template->{'src_base_url'}, $url);
}

for my $relation ($template->all_relations_of_class('ProductionBuilder::Relation::Tag::JavaScript')) {
    my $relation_url = $relation->get_url;
    next if defined $relation_url && $seen_asset_urls{$relation_url}++;
    my $asset;
    eval { $relation->get_asset; } || die $template->get_human_readable_src_url.": ".$@;
    my @asset_urls = get_asset_urls_for_javascript_asset($relation->get_asset, 1, 1);
    $relation->{'element'}->preinsert(map {
        HTML::Element->new('script', src => make_template_relative_url($_))
    } grep {!m/\.css$/} (@asset_urls));
    push @stylesheet_urls, map {make_template_relative_url $_} grep {m/\.css$/} (@asset_urls);
}

if (@stylesheet_urls) {
    my @stylesheet_elements;
    if ($use_css_imports) {
        # IE has a very arbitrary limitation of 31 <link rel='stylesheet'>s per page and
        # 31 @imports per stylesheet, which isn't quite enough for big web applications
        # that use one CSS file per class.
        # If the --use-css-imports switch is specified, we work around the limit by splitting
        # the includes into multiple <style type='text/css'> tags with up to 31 @import
        # statements in each, producing a development version that works in IE as long as there
        # are less than 961 stylesheets in total. It won't work with build-production.pl, though.
        for (my $i=0 ; $i<@stylesheet_urls ; $i+=31) {
            my $style = HTML::Element->new('style', type => 'text/css');
            $style->push_content(join("", map {"\@import url(\"$_\");\n"} grep defined, @stylesheet_urls[$i..$i+30]));
            push @stylesheet_elements, $style;
        }
    }else{
        @stylesheet_elements = map { HTML::Element->new('link', rel => 'stylesheet', type => 'text/css', href => $_) } @stylesheet_urls;
    }
    my $head_element = $template->{'parse_tree'}->look_down(_tag => 'head');
    my $first_script_element = $template->{'parse_tree'}->look_down(_tag => 'script');

    if ($first_script_element && $first_script_element->parent == $head_element) {
        $first_script_element->preinsert(@stylesheet_elements);
    }else{
        if (my $first_print_stylesheet_in_head = $head_element->look_down(_tag => 'link', rel => 'stylesheet', media => 'print')) {
            $first_print_stylesheet_in_head->preinsert(@stylesheet_elements);
        }else{
            $head_element->push_content(@stylesheet_elements);
        }
    }
}

$template->process;

if ($output_file_name) {
    FileUtils::write_file($output_file_name, $template->get_src, $charset);
}else{
    binmode STDOUT => ":encoding($charset)";
    print $template->get_src;
}
*/

/*
ext.jsb2:

{
    "projectName": "Ext JS",
    "deployDir": "ext-3.2+",
    "licenseText": "Ext JS Library 3.2.2\nCopyright(c) 2006-2010 Ext JS, Inc.\nlicensing@extjs.com\nhttp://www.extjs.com/license",
    "pkgs": [{
        "name": "Ext Base",
        "file": "adapter/ext/ext-base.js",
        "isDebug": true,
        "fileIncludes": [{
            "text": "Ext.js",
            "path": "src/ext-core/src/core/"
        },{
            "text": "Ext-more.js",
            "path": "src/core/"
        },{
            "text": "TaskMgr.js",
            "path": "src/ext-core/src/util/"
        },{
            "text": "ext-base-begin.js",
            "path": "src/ext-core/src/adapter/"
        },{
            "text": "ext-base-dom.js",
            "path": "src/ext-core/src/adapter/"
        },{
            "text": "ext-base-dom-more.js",
            "path": "src/adapter/"
        },{
            "text": "ext-base-event.js",
            "path": "src/ext-core/src/adapter/"
        },{
            "text": "ext-base-ajax.js",
            "path": "src/ext-core/src/adapter/"
        },{
            "text": "ext-base-region.js",
            "path": "src/ext-core/src/adapter/"
        },{
            "text": "ext-base-point.js",
            "path": "src/ext-core/src/adapter/"
        },{
            "text": "ext-base-anim.js",
            "path": "src/ext-core/src/adapter/"
        },{
            "text": "ext-base-anim-extra.js",
            "path": "src/ext-core/src/adapter/"
        },{
            "text": "ext-base-end.js",
            "path": "src/ext-core/src/adapter/"
        }]
    },{
        "name": "YUI Adapter",
        "file": "adapter/yui/ext-yui-adapter.js",
        "isDebug": true,
        "fileIncludes": [{
            "text": "Ext.js",
            "path": "src/ext-core/src/core/"
        },{
            "text": "Ext-more.js",
            "path": "src/core/"
        },{
            "text": "TaskMgr.js",
            "path": "src/ext-core/src/util/"
        },{
            "text": "yui-bridge.js",
            "path": "src/adapter/"
        }]
    },{
        "name": "Prototype Adapter",
        "file": "adapter/prototype/ext-prototype-adapter.js",
        "isDebug": true,
        "fileIncludes": [{
            "text": "Ext.js",
            "path": "src/ext-core/src/core/"
        },{
            "text": "Ext-more.js",
            "path": "src/core/"
        },{
            "text": "TaskMgr.js",
            "path": "src/ext-core/src/util/"
        },{
            "text": "prototype-bridge.js",
            "path": "src/adapter/"
        }]
    },{
        "name": "jQuery Adapter",
        "file": "adapter/jquery/ext-jquery-adapter.js",
        "isDebug": true,
        "fileIncludes": [{
            "text": "Ext.js",
            "path": "src/ext-core/src/core/"
        },{
            "text": "Ext-more.js",
            "path": "src/core/"
        },{
            "text": "TaskMgr.js",
            "path": "src/ext-core/src/util/"
        },{
            "text": "jquery-bridge.js",
            "path": "src/adapter/"
        }]
    },{
        "name": "Ext Foundation",
        "file": "pkgs/ext-foundation.js",
        "isDebug": true,
        "pkgDeps": ["ext-base.js"],
        "fileIncludes": [{
            "text": "DomHelper.js",
            "path": "src/ext-core/src/core/"
        },{
            "text": "DomHelper-more.js",
            "path": "src/core/"
        },{
            "text": "Template.js",
            "path": "src/ext-core/src/core/"
        },{
            "text": "Template-more.js",
            "path": "src/core/"
        },{
            "text": "DomQuery.js",
            "path": "src/ext-core/src/core/"
        },{
            "text": "DelayedTask.js",
            "path": "src/ext-core/src/util/"
        },{
            "text": "Observable.js",
            "path": "src/ext-core/src/util/"
        },{
            "text": "Observable-more.js",
            "path": "src/util/"
        },{
            "text": "EventManager.js",
            "path": "src/ext-core/src/core/"
        },{
            "text": "EventManager-more.js",
            "path": "src/core/"
        },{
            "text": "Element.js",
            "path": "src/ext-core/src/core/"
        },{
            "text": "Element-more.js",
            "path": "src/core/"
        },{
            "text": "Element.alignment.js",
            "path": "src/core/"
        },{
            "text": "Element.traversal.js",
            "path": "src/ext-core/src/core/"
        },{
            "text": "Element.traversal-more.js",
            "path": "src/core/"
        },{
            "text": "Element.insertion.js",
            "path": "src/ext-core/src/core/"
        },{
            "text": "Element.insertion-more.js",
            "path": "src/core/"
        },{
            "text": "Element.style.js",
            "path": "src/ext-core/src/core/"
        },{
            "text": "Element.style-more.js",
            "path": "src/core/"
        },{
            "text": "Element.position.js",
            "path": "src/ext-core/src/core/"
        },{
            "text": "Element.position-more.js",
            "path": "src/core/"
        },{
            "text": "Element.scroll.js",
            "path": "src/ext-core/src/core/"
        },{
            "text": "Element.scroll-more.js",
            "path": "src/core/"
        },{
            "text": "Element.fx.js",
            "path": "src/ext-core/src/core/"
        },{
            "text": "Element.fx-more.js",
            "path": "src/core/"
        },{
            "text": "Element.keys.js",
            "path": "src/core/"
        },{
            "text": "Fx.js",
            "path": "src/ext-core/src/core/"
        },{
            "text": "CompositeElementLite.js",
            "path": "src/ext-core/src/core/"
        },{
            "text": "CompositeElementLite-more.js",
            "path": "src/core/"
        },{
            "text": "CompositeElement.js",
            "path": "src/core/"
        },{
            "text": "Connection.js",
            "path": "src/ext-core/src/data/"
        },{
            "text": "UpdateManager.js",
            "path": "src/util/"
        },{
            "text": "Date.js",
            "path": "src/util/"
        },{
            "text": "MixedCollection.js",
            "path": "src/util/"
        },{
            "text": "JSON.js",
            "path": "src/ext-core/src/util/"
        },{
            "text": "Format.js",
            "path": "src/util/"
        },{
            "text": "XTemplate.js",
            "path": "src/util/"
        },{
            "text": "CSS.js",
            "path": "src/util/"
        },{
            "text": "ClickRepeater.js",
            "path": "src/util/"
        },{
            "text": "KeyNav.js",
            "path": "src/util/"
        },{
            "text": "KeyMap.js",
            "path": "src/util/"
        },{
            "text": "TextMetrics.js",
            "path": "src/util/"
        },{
            "text": "Cookies.js",
            "path": "src/util/"
        },{
            "text": "Error.js",
            "path": "src/core/"
        }]
    },{
        "name": "Drag Drop",
        "file": "pkgs/ext-dd.js",
        "isDebug": true,
        "pkgDeps": ["pkgs/ext-foundation.js"],
        "fileIncludes": [{
            "text": "DDCore.js",
            "path": "src/dd/"
        },{
            "text": "DragTracker.js",
            "path": "src/dd/"
        },{
            "text": "ScrollManager.js",
            "path": "src/dd/"
        },{
            "text": "Registry.js",
            "path": "src/dd/"
        },{
            "text": "StatusProxy.js",
            "path": "src/dd/"
        },{
            "text": "DragSource.js",
            "path": "src/dd/"
        },{
            "text": "DropTarget.js",
            "path": "src/dd/"
        },{
            "text": "DragZone.js",
            "path": "src/dd/"
        },{
            "text": "DropZone.js",
            "path": "src/dd/"
        },{
            "text": "Element.dd.js",
            "path": "src/core/"
        }]
    },{
        "name": "Data Foundation",
        "file": "pkgs/data-foundation.js",
        "isDebug": true,
        "pkgDeps": ["pkgs/ext-foundation.js"],
        "fileIncludes": [{
            "text": "Api.js",
            "path": "src/data/"
        },{
            "text": "SortTypes.js",
            "path": "src/data/"
        },{
            "text": "Record.js",
            "path": "src/data/"
        },{
            "text": "StoreMgr.js",
            "path": "src/data/"
        },{
            "text": "Store.js",
            "path": "src/data/"
        },{
            "text": "DataField.js",
            "path": "src/data/"
        },{
            "text": "DataReader.js",
            "path": "src/data/"
        },{
            "text": "DataWriter.js",
            "path": "src/data/"
        },{
            "text": "DataProxy.js",
            "path": "src/data/"
        },{
            "text": "Request.js",
            "path": "src/data/"
        }, {
            "text": "Response.js",
            "path": "src/data/"
        }, {
            "text": "ScriptTagProxy.js",
            "path": "src/data/"
        },{
            "text": "HttpProxy.js",
            "path": "src/data/"
        },{
            "text": "MemoryProxy.js",
            "path": "src/data/"
        },{
            "text": "Types.js",
            "path": "src/data/"
        }]
    },{
        "name": "Data - Json",
        "file": "pkgs/data-json.js",
        "isDebug": true,
        "pkgDeps": ["pkgs/data-foundation.js"],
        "fileIncludes": [{
            "text": "JsonWriter.js",
            "path": "src/data/"
        },{
            "text": "JsonReader.js",
            "path": "src/data/"
        },{
            "text": "ArrayReader.js",
            "path": "src/data/"
        },{
            "text": "ArrayStore.js",
            "path": "src/data/"
        },{
            "text": "JsonStore.js",
            "path": "src/data/"
        }]
    },{
        "name": "Data - XML",
        "file": "pkgs/data-xml.js",
        "isDebug": true,
        "pkgDeps": ["pkgs/data-foundation.js"],
        "fileIncludes": [{
            "text": "XmlWriter.js",
            "path": "src/data/"
        },{
            "text": "XmlReader.js",
            "path": "src/data/"
        },{
            "text": "XmlStore.js",
            "path": "src/data/"
        }]
    },{
        "name": "Data - GroupingStore",
        "file": "pkgs/data-grouping.js",
        "isDebug": true,
        "pkgDeps": ["pkgs/data-foundation.js"],
        "fileIncludes": [{
            "text": "GroupingStore.js",
            "path": "src/data/"
        }]
    },{
        "name": "Direct",
        "file": "pkgs/direct.js",
        "isDebug": true,
        "pkgDeps": ["pkgs/ext-foundation.js"],
        "fileIncludes": [{
            "text": "DirectProxy.js",
            "path": "src/data/"
        },{
            "text": "DirectStore.js",
            "path": "src/data/"
        },{
            "text": "Direct.js",
            "path": "src/direct/"
        },{
            "text": "Transaction.js",
            "path": "src/direct/"
        },{
            "text": "Event.js",
            "path": "src/direct/"
        },{
            "text": "Provider.js",
            "path": "src/direct/"
        },{
            "text": "JsonProvider.js",
            "path": "src/direct/"
        },{
            "text": "PollingProvider.js",
            "path": "src/direct/"
        },{
            "text": "RemotingProvider.js",
            "path": "src/direct/"
        }]
    },{
        "name": "Component Foundation",
        "file": "pkgs/cmp-foundation.js",
        "isDebug": true,
        "pkgDeps": ["pkgs/ext-foundation.js"],
        "fileIncludes": [{
            "text": "ComponentMgr.js",
            "path": "src/widgets/"
        },{
            "text": "Component.js",
            "path": "src/widgets/"
        },{
            "text": "Action.js",
            "path": "src/widgets/"
        },{
            "text": "Layer.js",
            "path": "src/widgets/"
        },{
            "text": "Shadow.js",
            "path": "src/widgets/"
        },{
            "text": "BoxComponent.js",
            "path": "src/widgets/"
        },{
            "text": "SplitBar.js",
            "path": "src/widgets/"
        },{
            "text": "Container.js",
            "path": "src/widgets/"
        },{
            "text": "ContainerLayout.js",
            "path": "src/widgets/layout/"
        },{
            "text": "AutoLayout.js",
            "path": "src/widgets/layout/"
        },{
            "text": "FitLayout.js",
            "path": "src/widgets/layout/"
        },{
            "text": "CardLayout.js",
            "path": "src/widgets/layout/"
        },{
            "text": "AnchorLayout.js",
            "path": "src/widgets/layout/"
        },{
            "text": "ColumnLayout.js",
            "path": "src/widgets/layout/"
        },{
            "text": "BorderLayout.js",
            "path": "src/widgets/layout/"
        },{
            "text": "FormLayout.js",
            "path": "src/widgets/layout/"
        },{
            "text": "AccordionLayout.js",
            "path": "src/widgets/layout/"
        },{
            "text": "TableLayout.js",
            "path": "src/widgets/layout/"
        },{
            "text": "AbsoluteLayout.js",
            "path": "src/widgets/layout/"
        },{
            "text": "BoxLayout.js",
            "path": "src/widgets/layout/"
        },{
            "text": "ToolbarLayout.js",
            "path": "src/widgets/layout/"
        },{
            "text": "MenuLayout.js",
            "path": "src/widgets/layout/"
        },{
            "text": "Viewport.js",
            "path": "src/widgets/"
        },{
            "text": "Panel.js",
            "path": "src/widgets/"
        },{
            "text": "Editor.js",
            "path": "src/widgets/"
        },{
            "text": "ColorPalette.js",
            "path": "src/widgets/"
        },{
            "text": "DatePicker.js",
            "path": "src/widgets/"
        },{
            "text": "LoadMask.js",
            "path": "src/widgets/"
        },{
            "text": "Slider.js",
            "path": "src/widgets/"
        },{
            "text": "ProgressBar.js",
            "path": "src/widgets/"
        }]
    },{
        "name": "Window",
        "file": "pkgs/window.js",
        "isDebug": true,
        "pkgDeps": ["pkgs/cmp-foundation.js"],
        "fileIncludes": [{
            "text": "Window.js",
            "path": "src/widgets/"
        },{
            "text": "WindowManager.js",
            "path": "src/widgets/"
        },{
            "text": "MessageBox.js",
            "path": "src/widgets/"
        },{
            "text": "PanelDD.js",
            "path": "src/widgets/"
        }]
    },{
        "name": "State",
        "file": "pkgs/state.js",
        "isDebug": true,
        "pkgDeps": ["pkgs/cmp-foundation.js"],
        "fileIncludes": [{
            "text": "Provider.js",
            "path": "src/state/"
        },{
            "text": "StateManager.js",
            "path": "src/state/"
        },{
            "text": "CookieProvider.js",
            "path": "src/state/"
        }]
    },{
        "name": "Data and ListViews",
        "file": "pkgs/data-list-views.js",
        "isDebug": true,
        "pkgDeps": ["pkgs/cmp-foundation.js","pkgs/data-foundation.js"],
        "fileIncludes": [{
            "text": "DataView.js",
            "path": "src/widgets/"
        },{
            "text": "ListView.js",
            "path": "src/widgets/list/"
        },{
            "text": "Column.js",
            "path": "src/widgets/list/"
        },{
            "text": "ColumnResizer.js",
            "path": "src/widgets/list/"
        },{
            "text": "Sorter.js",
            "path": "src/widgets/list/"
        }]
    },{
        "name": "Resizable",
        "file": "pkgs/resizable.js",
        "isDebug": true,
        "pkgs": ["pkgs/ext-foundation.js"],
        "fileIncludes": [{
            "text": "Resizable.js",
            "path": "src/widgets/"
        }]

    },{
        "name": "TabPanel",
        "file": "pkgs/pkg-tabs.js",
        "isDebug": true,
        "pkgs": ["pkgs/cmp-foundation.js"],
        "fileIncludes": [{
            "text": "TabPanel.js",
            "path": "src/widgets/"
        }]
    },{
        "name": "Buttons",
        "file": "pkgs/pkg-buttons.js",
        "isDebug": true,
        "pkgs": ["pkgs/cmp-foundation.js"],
        "fileIncludes": [{
            "text": "Button.js",
            "path": "src/widgets/"
        },{
            "text": "SplitButton.js",
            "path": "src/widgets/"
        },{
            "text": "CycleButton.js",
            "path": "src/widgets/"
        }]
    },{
        "name": "Toolbars",
        "file": "pkgs/pkg-toolbars.js",
        "type": "js",
        "isDebug": true,
        "pkgs": ["pkgs/cmp-foundation.js"],
        "fileIncludes": [{
            "text": "Toolbar.js",
            "path": "src/widgets/"
        },{
            "text": "ButtonGroup.js",
            "path": "src/widgets/"
        },{
            "text": "PagingToolbar.js",
            "path": "src/widgets/"
        }]
    },{
        "name": "History",
        "file": "pkgs/pkg-history.js",
        "isDebug": true,
        "pkgs": ["pkgs/ext-foundation.js"],
        "fileIncludes": [{
            "text": "History.js",
            "path": "src/util/"
        }]
    },{
        "name": "Tooltips",
        "file": "pkgs/pkg-tips.js",
        "isDebug": true,
        "pkgs": ["pkgs/cmp-foundation.js"],
        "fileIncludes": [{
            "text": "Tip.js",
            "path": "src/widgets/tips/"
        },{
            "text": "ToolTip.js",
            "path": "src/widgets/tips/"
        },{
            "text": "QuickTip.js",
            "path": "src/widgets/tips/"
        },{
            "text": "QuickTips.js",
            "path": "src/widgets/tips/"
        },{
            "text": "SliderTip.js",
            "path": "src/widgets/tips/"
        }]
    },{
        "name": "Trees",
        "file": "pkgs/pkg-tree.js",
        "isDebug": true,
        "pkgs": ["pkgs/cmp-foundation.js"],
        "fileIncludes": [{
            "text": "TreePanel.js",
            "path": "src/widgets/tree/"
        },{
            "text": "TreeEventModel.js",
            "path": "src/widgets/tree/"
        },{
            "text": "TreeSelectionModel.js",
            "path": "src/widgets/tree/"
        },{
            "text": "Tree.js",
            "path": "src/data/"
        },{
            "text": "TreeNode.js",
            "path": "src/widgets/tree/"
        },{
            "text": "AsyncTreeNode.js",
            "path": "src/widgets/tree/"
        },{
            "text": "TreeNodeUI.js",
            "path": "src/widgets/tree/"
        },{
            "text": "TreeLoader.js",
            "path": "src/widgets/tree/"
        },{
            "text": "TreeFilter.js",
            "path": "src/widgets/tree/"
        },{
            "text": "TreeSorter.js",
            "path": "src/widgets/tree/"
        },{
            "text": "TreeDropZone.js",
            "path": "src/widgets/tree/"
        },{
            "text": "TreeDragZone.js",
            "path": "src/widgets/tree/"
        },{
            "text": "TreeEditor.js",
            "path": "src/widgets/tree/"
        }]
    },{
        "name": "Charts",
        "file": "pkgs/pkg-charts.js",
        "isDebug": true,
        "pkgs": ["pkgs/cmp-foundation.js"],
        "fileIncludes": [{
            "text": "swfobject.js",
            "path": "src/widgets/chart/"
        },{
            "text": "FlashComponent.js",
            "path": "src/widgets/chart/"
        },{
            "text": "EventProxy.js",
            "path": "src/widgets/chart/"
        },{
            "text": "Chart.js",
            "path": "src/widgets/chart/"
        }]
    },{
        "name": "Menu",
        "file": "pkgs/pkg-menu.js",
        "isDebug": true,
        "pkgs": ["pkgs/cmp-foundation.js"],
        "fileIncludes": [{
            "text": "Menu.js",
            "path": "src/widgets/menu/"
        },{
            "text": "MenuMgr.js",
            "path": "src/widgets/menu/"
        },{
            "text": "BaseItem.js",
            "path": "src/widgets/menu/"
        },{
            "text": "TextItem.js",
            "path": "src/widgets/menu/"
        },{
            "text": "Separator.js",
            "path": "src/widgets/menu/"
        },{
            "text": "Item.js",
            "path": "src/widgets/menu/"
        },{
            "text": "CheckItem.js",
            "path": "src/widgets/menu/"
        },{
            "text": "DateMenu.js",
            "path": "src/widgets/menu/"
        },{
            "text": "ColorMenu.js",
            "path": "src/widgets/menu/"
        }]
    },{
        "name": "Forms",
        "file": "pkgs/pkg-forms.js",
        "isDebug": true,
        "pkgs": ["pkgs/cmp-foundation.js"],
        "fileIncludes": [{
            "text": "Field.js",
            "path": "src/widgets/form/"
        },{
            "text": "TextField.js",
            "path": "src/widgets/form/"
        },{
            "text": "TriggerField.js",
            "path": "src/widgets/form/"
        },{
            "text": "TextArea.js",
            "path": "src/widgets/form/"
        },{
            "text": "NumberField.js",
            "path": "src/widgets/form/"
        },{
            "text": "DateField.js",
            "path": "src/widgets/form/"
        },{
            "text": "DisplayField.js",
            "path": "src/widgets/form/"
        },{
            "text": "Combo.js",
            "path": "src/widgets/form/"
        },{
            "text": "Checkbox.js",
            "path": "src/widgets/form/"
        },{
            "text": "CheckboxGroup.js",
            "path": "src/widgets/form/"
        },{
            "text": "CompositeField.js",
            "path": "src/widgets/form/"
        },{
            "text": "Radio.js",
            "path": "src/widgets/form/"
        },{
            "text": "RadioGroup.js",
            "path": "src/widgets/form/"
        },{
            "text": "Hidden.js",
            "path": "src/widgets/form/"
        },{
            "text": "BasicForm.js",
            "path": "src/widgets/form/"
        },{
            "text": "Form.js",
            "path": "src/widgets/form/"
        },{
            "text": "FieldSet.js",
            "path": "src/widgets/form/"
        },{
            "text": "HtmlEditor.js",
            "path": "src/widgets/form/"
        },{
            "text": "TimeField.js",
            "path": "src/widgets/form/"
        },{
            "text": "SliderField.js",
            "path": "src/widgets/form/"
        },{
            "text": "Label.js",
            "path": "src/widgets/form/"
        },{
            "text": "Action.js",
            "path": "src/widgets/form/"
        },{
            "text": "VTypes.js",
            "path": "src/widgets/form/"
        }]
    },{
        "name": "Grid Foundation",
        "file": "pkgs/pkg-grid-foundation.js",
        "isDebug": true,
        "pkgs": ["pkgs/cmp-foundation.js"],
        "fileIncludes": [{
            "text": "GridPanel.js",
            "path": "src/widgets/grid/"
        },{
            "text": "GridView.js",
            "path": "src/widgets/grid/"
        },{
            "text": "ColumnDD.js",
            "path": "src/widgets/grid/"
        },{
            "text": "ColumnSplitDD.js",
            "path": "src/widgets/grid/"
        },{
            "text": "GridDD.js",
            "path": "src/widgets/grid/"
        },{
            "text": "ColumnModel.js",
            "path": "src/widgets/grid/"
        },{
            "text": "AbstractSelectionModel.js",
            "path": "src/widgets/grid/"
        },{
            "text": "RowSelectionModel.js",
            "path": "src/widgets/grid/"
        },{
            "text": "Column.js",
            "path": "src/widgets/grid/"
        },{
            "text": "RowNumberer.js",
            "path": "src/widgets/grid/"
        },{
            "text": "CheckboxSelectionModel.js",
            "path": "src/widgets/grid/"
        }]
    },{
        "name": "Grid Editor",
        "file": "pkgs/pkg-grid-editor.js",
        "isDebug": true,
        "pkgs": ["pkgs/pkg-grid-foundation.js"],
        "fileIncludes": [{
            "text": "CellSelectionModel.js",
            "path": "src/widgets/grid/"
        },{
            "text": "EditorGrid.js",
            "path": "src/widgets/grid/"
        },{
            "text": "GridEditor.js",
            "path": "src/widgets/grid/"
        }]
    },{
        "name": "Grid - Property Grid",
        "file": "pkgs/pkg-grid-property.js",
        "isDebug": true,
        "pkgs": ["pkgs/pkg-grid-foundation.js"],
        "fileIncludes": [{
            "text": "PropertyGrid.js",
            "path": "src/widgets/grid/"
        }]
    },{
        "name": "Grid - GroupingView",
        "file": "pkgs/pkg-grid-grouping.js",
        "isDebug": true,
        "pkgs": ["pkgs/pkg-grid-foundation.js", "pkgs/data-grouping.js"],
        "fileIncludes": [{
            "text": "GroupingView.js",
            "path": "src/widgets/grid/"
        }]
    },{
        "name": "Ext All",
        "file": "ext-all.js",
        "isDebug": true,
        "includeDeps": true,
        "pkgDeps": [
            "pkgs/ext-foundation.js",
            "pkgs/cmp-foundation.js",
            "pkgs/ext-dd.js",
            "pkgs/data-foundation.js",
            "pkgs/data-json.js",
            "pkgs/data-xml.js",
            "pkgs/data-grouping.js",
            "pkgs/direct.js",
            "pkgs/resizable.js",
            "pkgs/window.js",
            "pkgs/state.js",
            "pkgs/data-list-views.js",
            "pkgs/pkg-tabs.js",
            "pkgs/pkg-buttons.js",
            "pkgs/pkg-toolbars.js",
            "pkgs/pkg-history.js",
            "pkgs/pkg-tips.js",
            "pkgs/pkg-tree.js",
            "pkgs/pkg-charts.js",
            "pkgs/pkg-menu.js",
            "pkgs/pkg-forms.js",
            "pkgs/pkg-grid-foundation.js",
            "pkgs/pkg-grid-editor.js",
            "pkgs/pkg-grid-property.js",
            "pkgs/pkg-grid-grouping.js"
        ],
        "fileIncludes": []
    },{
       "name": "User Extension JS Pack",
       "file": "examples/ux/ux-all.js",
       "isDebug": true,
       "fileIncludes": [{
          "text": "BufferView.js",
          "path": "examples/ux/"
       },{
          "text": "CenterLayout.js",
          "path": "examples/ux/"
       },{
          "text": "CheckColumn.js",
          "path": "examples/ux/"
       },{
          "text": "ColumnHeaderGroup.js",
          "path": "examples/ux/"
       },{
          "text": "ColumnNodeUI.js",
          "path": "examples/ux/"
       },{
          "text": "DataView-more.js",
          "path": "examples/ux/"
       },{
          "text": "FileUploadField.js",
          "path": "examples/ux/fileuploadfield/"
       },{
          "text": "GMapPanel.js",
          "path": "examples/ux/"
       },{
          "text": "GridFilters.js",
          "path": "examples/ux/gridfilters/"
       },{
          "text": "Filter.js",
          "path": "examples/ux/gridfilters/filter/"
       },{
          "text": "BooleanFilter.js",
          "path": "examples/ux/gridfilters/filter/"
       },{
          "text": "DateFilter.js",
          "path": "examples/ux/gridfilters/filter/"
       },{
          "text": "ListFilter.js",
          "path": "examples/ux/gridfilters/filter/"
       },{
          "text": "NumericFilter.js",
          "path": "examples/ux/gridfilters/filter/"
       },{
          "text": "StringFilter.js",
          "path": "examples/ux/gridfilters/filter/"
       },{
          "text": "ListMenu.js",
          "path": "examples/ux/gridfilters/menu/"
       },{
          "text": "RangeMenu.js",
          "path": "examples/ux/gridfilters/menu/"
       },{
          "text": "GroupSummary.js",
          "path": "examples/ux/"
       },{
          "text": "GroupTab.js",
          "path": "examples/ux/"
       },{
          "text": "GroupTabPanel.js",
          "path": "examples/ux/"
       },{
          "text": "ItemSelector.js",
          "path": "examples/ux/"
       },{
          "text": "LockingGridView.js",
          "path": "examples/ux/"
       },{
          "text": "MultiSelect.js",
          "path": "examples/ux/"
       },{
          "text": "PagingMemoryProxy.js",
          "path": "examples/ux/"
       },{
          "text": "PanelResizer.js",
          "path": "examples/ux/"
       },{
          "text": "Portal.js",
          "path": "examples/ux/"
       },{
          "text": "PortalColumn.js",
          "path": "examples/ux/"
       },{
          "text": "Portlet.js",
          "path": "examples/ux/"
       },{
          "text": "ProgressBarPager.js",
          "path": "examples/ux/"
       },{
          "text": "RowEditor.js",
          "path": "examples/ux/"
       },{
          "text": "RowExpander.js",
          "path": "examples/ux/"
       },{
          "text": "RowLayout.js",
          "path": "examples/ux/"
       },{
          "text": "SearchField.js",
          "path": "examples/ux/"
       },{
          "text": "SelectBox.js",
          "path": "examples/ux/"
       },{
          "text": "SlidingPager.js",
          "path": "examples/ux/"
       },{
          "text": "SpinnerField.js",
          "path": "examples/ux/"
       },{
          "text": "Spinner.js",
          "path": "examples/ux/"
       },{
          "text": "Spotlight.js",
          "path": "examples/ux/"
       },{
          "text": "StatusBar.js",
          "path": "examples/ux/statusbar/"
       },{
          "text": "TabCloseMenu.js",
          "path": "examples/ux/"
       },{
          "text": "TableGrid.js",
          "path": "examples/ux/"
       },{
          "text": "TabScrollerMenu.js",
          "path": "examples/ux/"
       },{
          "text": "XmlTreeLoader.js",
          "path": "examples/ux/"
       },{
          "text": "ValidationStatus.js",
          "path": "examples/ux/statusbar/"
       }, {
          "text": "TreeGridColumns.js",
          "path": "examples/ux/treegrid/"
       },{
          "text": "TreeGridNodeUI.js",
          "path": "examples/ux/treegrid/"
       },{
          "text": "TreeGridColumnResizer.js",
          "path": "examples/ux/treegrid/"
       },{
          "text": "TreeGridSorter.js",
          "path": "examples/ux/treegrid/"
       },{
          "text": "TreeGridLoader.js",
          "path": "examples/ux/treegrid/"
       },{
          "text": "TreeGrid.js",
          "path": "examples/ux/treegrid/"
       }]
    },{
       "name": "User Extension CSS Pack",
       "file": "examples/ux/css/ux-all.css",
       "fileIncludes": [{
          "text": "CenterLayout.css",
          "path": "examples/ux/css/"
       },{
          "text": "ColumnHeaderGroup.css",
          "path": "examples/ux/css/"
       },{
          "text": "ColumnNodeUI.css",
          "path": "examples/ux/css/"
       },{
          "text": "fileuploadfield.css",
          "path": "examples/ux/fileuploadfield/css/"
       },{
          "text": "GridFilters.css",
          "path": "examples/ux/gridfilters/css/"
       },{
          "text": "RangeMenu.css",
          "path": "examples/ux/gridfilters/css/"
       },{
          "text": "GroupSummary.css",
          "path": "examples/ux/css/"
       },{
          "text": "GroupTab.css",
          "path": "examples/ux/css/"
       },{
          "text": "LockingGridView.css",
          "path": "examples/ux/css/"
       },{
          "text": "MultiSelect.css",
          "path": "examples/ux/css/"
       },{
          "text": "PanelResizer.css",
          "path": "examples/ux/css/"
       },{
          "text": "Portal.css",
          "path": "examples/ux/css/"
       },{
          "text": "RowEditor.css",
          "path": "examples/ux/css/"
       },{
          "text": "Spinner.css",
          "path": "examples/ux/css/"
       },{
          "text": "statusbar.css",
          "path": "examples/ux/statusbar/css/"
       },{
          "text": "treegrid.css",
          "path": "examples/ux/treegrid/"
       }]
    },{
       "name": "Ext All CSS",
       "file": "resources/css/ext-all.css",
       "fileIncludes": [],
       "includeDeps": true,
       "pkgDeps": [
           "resources/css/ext-all-notheme.css",
           "resources/css/xtheme-blue.css"
       ]
    },{
       "name": "Ext All CSS No theme",
       "file": "resources/css/ext-all-notheme.css",
       "fileIncludes": [{
           "text": "reset.css",
           "path": "resources/css/structure/"
       },{
           "text": "core.css",
           "path": "resources/css/structure/"
       },{
            "text": "resizable.css",
            "path": "resources/css/structure/"
       },{
           "text": "tabs.css",
           "path": "resources/css/structure/"
       },{
           "text": "form.css",
           "path": "resources/css/structure/"
       },{
           "text": "button.css",
           "path": "resources/css/structure/"
       },{
           "text": "toolbar.css",
           "path": "resources/css/structure/"
       },{
           "text": "grid.css",
           "path": "resources/css/structure/"
       },{
           "text": "dd.css",
           "path": "resources/css/structure/"
       },{
           "text": "tree.css",
           "path": "resources/css/structure/"
       },{
           "text": "date-picker.css",
           "path": "resources/css/structure/"
       },{
           "text": "qtips.css",
           "path": "resources/css/structure/"
       },{
           "text": "menu.css",
           "path": "resources/css/structure/"
       },{
           "text": "box.css",
           "path": "resources/css/structure/"
       },{
           "text": "combo.css",
           "path": "resources/css/structure/"
       },{
           "text": "panel.css",
           "path": "resources/css/structure/"
       },{
           "text": "panel-reset.css",
           "path": "resources/css/structure/"
       },{
           "text": "window.css",
           "path": "resources/css/structure/"
       },{
           "text": "editor.css",
           "path": "resources/css/structure/"
       },{
           "text": "borders.css",
           "path": "resources/css/structure/"
       },{
           "text": "layout.css",
           "path": "resources/css/structure/"
       },{
           "text": "progress.css",
           "path": "resources/css/structure/"
       },{
           "text": "list-view.css",
           "path": "resources/css/structure/"
       },{
           "text": "slider.css",
           "path": "resources/css/structure/"
       },{
           "text": "dialog.css",
           "path": "resources/css/structure/"
       }]
    },{
       "name": "Ext Blue Theme",
       "file": "resources/css/xtheme-blue.css",
       "fileIncludes": [{
           "text": "core.css",
           "path": "resources/css/visual/"
       },{
           "text": "tabs.css",
           "path": "resources/css/visual/"
       },{
           "text": "form.css",
           "path": "resources/css/visual/"
       },{
           "text": "button.css",
           "path": "resources/css/visual/"
       },{
           "text": "toolbar.css",
           "path": "resources/css/visual/"
       },{
           "text": "resizable.css",
           "path": "resources/css/visual/"
       },{
           "text": "grid.css",
           "path": "resources/css/visual/"
       },{
           "text": "dd.css",
           "path": "resources/css/visual/"
       },{
           "text": "tree.css",
           "path": "resources/css/visual/"
       },{
           "text": "date-picker.css",
           "path": "resources/css/visual/"
       },{
           "text": "qtips.css",
           "path": "resources/css/visual/"
       },{
           "text": "menu.css",
           "path": "resources/css/visual/"
       },{
           "text": "box.css",
           "path": "resources/css/visual/"
       },{
           "text": "combo.css",
           "path": "resources/css/visual/"
       },{
           "text": "panel.css",
           "path": "resources/css/visual/"
       },{
           "text": "window.css",
           "path": "resources/css/visual/"
       },{
           "text": "editor.css",
           "path": "resources/css/visual/"
       },{
           "text": "borders.css",
           "path": "resources/css/visual/"
       },{
           "text": "layout.css",
           "path": "resources/css/visual/"
       },{
           "text": "progress.css",
           "path": "resources/css/visual/"
       },{
           "text": "list-view.css",
           "path": "resources/css/visual/"
       },{
           "text": "slider.css",
           "path": "resources/css/visual/"
       },{
           "text": "dialog.css",
           "path": "resources/css/visual/"
       }]
    },{
       "name": "Your Theme",
       "file": "resources/css/yourtheme.css",
       "fileIncludes": [{
           "text": "core.css",
           "path": "resources/css/visual/"
       },{
           "text": "tabs.css",
           "path": "resources/css/visual/"
       },{
           "text": "form.css",
           "path": "resources/css/visual/"
       },{
           "text": "button.css",
           "path": "resources/css/visual/"
       },{
           "text": "toolbar.css",
           "path": "resources/css/visual/"
       },{
           "text": "resizable.css",
           "path": "resources/css/visual/"
       },{
           "text": "grid.css",
           "path": "resources/css/visual/"
       },{
           "text": "dd.css",
           "path": "resources/css/visual/"
       },{
           "text": "tree.css",
           "path": "resources/css/visual/"
       },{
           "text": "date-picker.css",
           "path": "resources/css/visual/"
       },{
           "text": "qtips.css",
           "path": "resources/css/visual/"
       },{
           "text": "menu.css",
           "path": "resources/css/visual/"
       },{
           "text": "box.css",
           "path": "resources/css/visual/"
       },{
           "text": "combo.css",
           "path": "resources/css/visual/"
       },{
           "text": "panel.css",
           "path": "resources/css/visual/"
       },{
           "text": "window.css",
           "path": "resources/css/visual/"
       },{
           "text": "editor.css",
           "path": "resources/css/visual/"
       },{
           "text": "borders.css",
           "path": "resources/css/visual/"
       },{
           "text": "layout.css",
           "path": "resources/css/visual/"
       },{
           "text": "progress.css",
           "path": "resources/css/visual/"
       },{
           "text": "list-view.css",
           "path": "resources/css/visual/"
       },{
           "text": "slider.css",
           "path": "resources/css/visual/"
       },{
           "text": "dialog.css",
           "path": "resources/css/visual/"
       }]
    },{
       "name": "Ext Gray Theme",
       "file": "resources/css/xtheme-gray.css",
       "fileIncludes": [{
           "text": "core.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "tabs.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "form.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "button.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "toolbar.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "resizable.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "grid.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "dd.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "tree.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "date-picker.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "qtips.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "menu.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "box.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "combo.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "panel.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "window.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "editor.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "borders.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "layout.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "progress.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "list-view.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "slider.css",
           "path": "resources/css/theme-gray/"
       },{
           "text": "dialog.css",
           "path": "resources/css/theme-gray/"
       }]
    },{
       "name": "Ext Accessibility Theme",
       "file": "resources/css/xtheme-access.css",
       "fileIncludes": [{
           "text": "core.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "tabs.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "form.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "button.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "toolbar.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "resizable.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "grid.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "dd.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "tree.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "date-picker.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "qtips.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "menu.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "box.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "combo.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "panel.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "window.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "editor.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "borders.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "layout.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "progress.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "list-view.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "slider.css",
           "path": "resources/css/theme-access/"
       },{
           "text": "dialog.css",
           "path": "resources/css/theme-access/"
       }]
    },{
       "name": "Ext Debug CSS",
       "file": "resources/css/debug.css",
       "fileIncludes": [{
           "text": "debug.css",
           "path": "resources/css/structure/"
       },{
           "text": "debug.css",
           "path": "resources/css/visual/"
        }]
    }],
    "resources": [{
        "src": "src/",
        "dest": "src/",
        "filters": ".*\\.js"
    },{
        "src": "examples/",
        "dest": "examples/",
        "filters": ".*[\\.html|\\.jpg|\\.png|\\.gif|\\.css|\\.js|\\.php]"
    },{
        "src": "test/",
        "dest": "test/",
        "filters": ".*[\\.js]"
    },{
        "src": "welcome/",
        "dest": "welcome/",
        "filters": ".*"
    },{
        "src": "index.html",
        "dest": "index.html",
        "filters": ".*"
    },{
        "src": "resources/",
        "dest": "resources/",
        "filters": ".*"
    },{
        "src": "license.txt",
        "dest": "license.txt",
        "filters": ".*"
    },{
        "src": "gpl-3.0.txt",
        "dest": "gpl-3.0.txt",
        "filters": ".*"
    },{
        "src": "INCLUDE_ORDER.txt",
        "dest": "INCLUDE_ORDER.txt",
        "filters": ".*"
    },{
        "src": "ext.jsb2",
        "dest": "ext.jsb2",
        "filters": ".*"
    }]
}
*/