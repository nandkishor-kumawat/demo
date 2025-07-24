#import "FileShareModule.h"
#import <React/RCTLog.h>
#import <React/RCTUtils.h>

@implementation FileShareModule

static NSMutableArray *sharedFiles = nil;

RCT_EXPORT_MODULE();

+ (void)initialize {
    if (self == [FileShareModule class]) {
        sharedFiles = [[NSMutableArray alloc] init];
    }
}

+ (void)addSharedFile:(NSDictionary *)file {
    if (sharedFiles == nil) {
        sharedFiles = [[NSMutableArray alloc] init];
    }
    [sharedFiles addObject:file];
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

RCT_EXPORT_METHOD(getSharedFiles:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSArray *files = [sharedFiles copy];
    resolve(files);
}

RCT_EXPORT_METHOD(clearSharedFiles) {
    [sharedFiles removeAllObjects];
}

@end
